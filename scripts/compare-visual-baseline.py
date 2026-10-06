#!/usr/bin/env python3
import argparse
import json
import os
import sys
from pathlib import Path

from PIL import Image, ImageChops

def parse_args():
    p=argparse.ArgumentParser(description="Compare Wild Ones visual QA screenshots against the approved main baseline.")
    p.add_argument("--baseline", required=True)
    p.add_argument("--candidate", required=True)
    p.add_argument("--output", default="visual-diff")
    p.add_argument("--pixel-threshold", type=int, default=18)
    p.add_argument("--max-diff-ratio", type=float, default=0.005)
    p.add_argument("--allow-changes", action="store_true")
    p.add_argument("--allow-added", action="store_true", help="Bootstrap new screenshots when migrating from a legacy baseline.")
    p.add_argument("--legacy-bootstrap", action="store_true", help="Report legacy-baseline drift without blocking the one-time migration to deterministic baselines.")
    return p.parse_args()

def pngs(root):
    root=Path(root)
    return {str(p.relative_to(root)).replace(os.sep,"/"):p for p in root.rglob("*.png")}

def changed_mask(diff, threshold):
    rgb=diff.convert("RGB")
    return rgb.point(lambda x: 255 if x > threshold else 0).convert("L")

def pixel_ratio(mask):
    hist=mask.histogram()
    total=sum(hist)
    changed=total-hist[0]
    return (changed/total if total else 0.0), changed, total

def diff_overlay(candidate, mask):
    base=candidate.convert("RGBA")
    red=Image.new("RGBA", base.size, (255,38,72,0))
    alpha=mask.point(lambda x: 150 if x else 0)
    red.putalpha(alpha)
    return Image.alpha_composite(base,red)

def main():
    a=parse_args()
    baseline=pngs(a.baseline)
    candidate=pngs(a.candidate)
    out=Path(a.output)
    (out/"diffs").mkdir(parents=True,exist_ok=True)
    keys=sorted(set(baseline)|set(candidate))
    records=[]
    blocking=[]

    for key in keys:
        b=baseline.get(key)
        c=candidate.get(key)
        rec={"file":key,"status":"same","diffRatio":0.0,"changedPixels":0,"totalPixels":0}
        if b is None:
            rec.update(status="added",diffRatio=1.0)
            if not a.allow_added:
                blocking.append(key)
        elif c is None:
            rec.update(status="removed",diffRatio=1.0)
            blocking.append(key)
        else:
            bi=Image.open(b).convert("RGBA")
            ci=Image.open(c).convert("RGBA")
            if bi.size != ci.size:
                rec.update(status="dimension-change",baselineSize=list(bi.size),candidateSize=list(ci.size),diffRatio=1.0)
                blocking.append(key)
            else:
                diff=ImageChops.difference(bi,ci)
                rec["totalPixels"]=ci.width*ci.height
                # Most release-only PRs do not change rendered pixels. Pillow's
                # getbbox() is implemented in C and lets us skip the expensive
                # threshold-mask + histogram pass for byte-identical renders
                # without weakening pixel-level coverage for changed images.
                if diff.getbbox() is not None:
                    mask=changed_mask(diff,a.pixel_threshold)
                    ratio,changed,total=pixel_ratio(mask)
                    rec["diffRatio"]=ratio
                    rec["changedPixels"]=changed
                    rec["totalPixels"]=total
                    if changed:
                        rec["status"]="changed" if ratio <= a.max_diff_ratio else "regression"
                        diff_path=out/"diffs"/key
                        diff_path.parent.mkdir(parents=True,exist_ok=True)
                        diff_overlay(ci,mask).save(diff_path,optimize=True)
                        rec["diffImage"]=str(diff_path.relative_to(out)).replace(os.sep,"/")
                        if ratio > a.max_diff_ratio:
                            blocking.append(key)
        records.append(rec)

    changed=[r for r in records if r["status"]!="same"]
    report={
        "schemaVersion":1,
        "baseline":str(Path(a.baseline)),
        "candidate":str(Path(a.candidate)),
        "pixelThreshold":a.pixel_threshold,
        "maxDiffRatio":a.max_diff_ratio,
        "comparedScreenshots":len(records),
        "changedScreenshots":len(changed),
        "blockingScreenshots":len(blocking),
        "approvedOverride":bool(a.allow_changes),
        "bootstrapAddedAllowed":bool(a.allow_added),
        "status":"LEGACY_BOOTSTRAP" if blocking and a.legacy_bootstrap else ("APPROVED_CHANGE" if blocking and a.allow_changes else ("FAIL" if blocking else "PASS")),
        "records":records
    }
    (out/"report.json").write_text(json.dumps(report,indent=2),encoding="utf-8")

    lines=[
        "# Visual Regression Comparison","",
        f"Status: **{report['status']}**",
        f"Compared screenshots: **{len(records)}**",
        f"Changed screenshots: **{len(changed)}**",
        f"Blocking screenshots: **{len(blocking)}**",
        f"Fail threshold: **{a.max_diff_ratio*100:.2f}%** changed pixels per screenshot",
        "",
        "| Screenshot | State | Changed pixels |",
        "| --- | --- | ---: |"
    ]
    if changed:
        for rec in sorted(changed,key=lambda r:r["diffRatio"],reverse=True):
            lines.append(f"| `{rec['file']}` | {rec['status']} | {rec['diffRatio']*100:.3f}% |")
    else:
        lines.append("| All screenshots | unchanged | 0.000% |")
    lines += ["","Diff overlays use red to mark pixels that differ from the approved main baseline."]
    (out/"report.md").write_text("\n".join(lines)+"\n",encoding="utf-8")
    print("\n".join(lines[:8]))

    if blocking and not (a.allow_changes or a.legacy_bootstrap):
        print("Visual regression requires review. Add the PR label visual-approved only after inspecting the uploaded diff artifact.",file=sys.stderr)
        return 2
    return 0

if __name__=="__main__":
    raise SystemExit(main())
