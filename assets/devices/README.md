# Device Images — Manual Overrides

Drop device photos here to override automatic image lookup. These images always win over the API cascade (Wikimedia, Openverse, Unsplash).

## How to use

1. Create a folder named after the device slug (e.g., `samsung-s24-ultra`, `iphone-15-pro`).
2. Add image files (`.jpg`, `.png`, or `.webp`).
3. (Optional) Add a `licence.txt` file in the same folder with licensing information.

**Example folder structure:**
```
assets/devices/
├── samsung-s24-ultra/
│   ├── 01.jpg
│   ├── 02.jpg
│   └── licence.txt
└── iphone-15-pro/
    └── 01.jpg
```

## License file format

If you add `licence.txt`, the first line becomes the license credit (e.g., "CC BY-SA 4.0", "Public domain"). An optional second line specifies the author or photographer's name.

**Example `licence.txt`:**
```
CC BY-SA 4.0
Photo by Jane Smith
```

If there is no `licence.txt`, the default credit is "Manually supplied".

## Important

- **Only add images you have the right to use.** Always verify the manufacturer's or photographer's license before adding a file here.
- The pipeline reads images in filename sort order (e.g., 01.jpg before 02.jpg), so name them clearly if you have multiple photos per device.
- These are committed to the repository, so keep file sizes reasonable (max ~500 KB per image).
