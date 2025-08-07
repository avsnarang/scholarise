# Branch Logos Directory

This directory contains branch-specific logos organized by branch codes.

## Structure
```
logos/
├── TSHPS/          # Paonta Sahib branch
│   └── logo.png
├── TSHB/           # Another branch
│   └── logo.png
└── default/        # Default logo if branch-specific not found
    └── logo.png
```

## Logo Requirements
- Format: PNG (preferably with transparent background)
- Recommended size: 192x192px or 256x256px
- File name: Must be `logo.png`

## Usage
The receipt generation system will automatically use the appropriate logo based on the branch code extracted from the receipt number or branch data.

For example:
- Receipt `TSHPS/FIN/2025-26/000001` will use `/logos/TSHPS/logo.png`
- If branch-specific logo not found, falls back to `/logos/default/logo.png`

## Adding New Branch Logos
1. Create a new folder with the exact branch code (case-sensitive)
2. Add the logo as `logo.png` inside that folder
3. The system will automatically pick it up

## Default Logo
Place a default logo at `/logos/default/logo.png` which will be used when:
- Branch code cannot be determined
- Branch-specific logo doesn't exist

