# YouTube Restriction Manager

A browser extension that allows you to control YouTube's content restrictions by injecting the appropriate HTTP headers.

## Screenshots
<img width="1917" height="1003" alt="image" src="https://github.com/user-attachments/assets/76be3cea-5be5-4afb-b00c-2c1e4e333164" />
<img width="1919" height="1002" alt="image" src="https://github.com/user-attachments/assets/9e79e6ad-2927-499c-b7df-c551c02c6519" />
<img width="1919" height="1004" alt="image" src="https://github.com/user-attachments/assets/11962238-a673-4c8f-b334-573a282bd593" />


## Features

- Set YouTube restriction level to None, Moderate, or Strict
- Clean, modern UI with red theme
- Compatible with both Chrome and Firefox

## Usage/Installation
Head over to [here](https://www.youtube.com/check_content_restrictions) to check your current restriction level. This tool will only have a chance of working if it says YouTube is filtered through HTTP Header restrictions or if it doesn't have any restrictions. If it has DNS blocking active this tool will probably not work.

### For Chrome/Chromium Browsers:
1. Download or clone this repository/Download from releases
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top right)
4. Click "Load unpacked" and select the extension directory

### For Firefox:
1. Download or clone this repository/Download from releases
2. Open Firefox and go to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select any file in the extension directory

## Usage

1. Click the extension icon in your browser's toolbar
2. Select your desired restriction level:
   - **None**: No restrictions
   - **Moderate**: Moderate content filtering
   - **Strict**: Strict content filtering
3. The setting will be automatically saved and applied to all YouTube pages

## How It Works

This extension works by injecting the `YouTube-Restrict` HTTP header into requests to YouTube's domains. The header tells YouTube which restriction level to apply to the content.

## Permissions

This extension requires the following permissions:
- `webRequest` and `webRequestAuthProvider`: To modify HTTP headers
- `storage`: To save your preference between sessions
- Access to YouTube domains: To apply the restrictions

## License

MIT
