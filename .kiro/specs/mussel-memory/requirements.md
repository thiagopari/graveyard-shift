# Requirements: mussel-memory (EARS)

## R1 Photo checks
1.1 When a photo is submitted, the system shall compute blur (variance of the Laplacian), exposure, haze and screen coverage in the browser using canvas pixel data.
1.2 If blur, exposure, haze or screen coverage fails its threshold, then the system shall mark the photo "retake" and shall not compute a score.

## R2 Metric
2.1 When all checks pass, the system shall compute percent blocked as the share of screen-ROI pixels classified as debris by a colour/texture threshold.

## R3 Triage
3.1 The system shall compute risk as percent blocked x growth x days-since-cleaning factor, capped at 1.
3.2 When a photo is "retake", the system shall show a Needs you card asking for a retake and no number.

## R4 Synthetic data
4.1 The generator script shall write 30 synthetic screen images with known percent blocked, including blurred, dark and hazy ones, and a manifest.
4.2 Tests shall assert error <= 10 points on usable images and "retake" on every blurred or dark image.
4.3 The repo shall contain no real-site images.

## R5 App
5.1 The app shall be a static page that loads a photo, shows the inbox, and exports a Markdown report.
