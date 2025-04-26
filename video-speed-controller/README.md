# Video Speed Controller

A Tampermonkey userscript that adds speed control functionality to all videos on any website.

## Description

Video Speed Controller is a browser userscript that enhances your video watching experience by allowing you to control the playback speed of any HTML5 video across the web. The script adds a sleek, non-intrusive control panel to videos that appears when you hover over them.

## Features

- Works on all websites with HTML5 videos
- Floating control panel that appears on hover
- Preset speed options (0.1x, 0.5x, 1x, 1.5x, 2x, 2.5x, 3x, 4x)
- Custom speed input for precise control
- Speed settings persist during video playback
- Non-intrusive UI that automatically hides when not in use
- Compatible with dynamically loaded videos

## Installation

1. First, install the Tampermonkey extension for your browser:
   - [Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - [Firefox](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
   - [Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)
   - [Safari](https://apps.apple.com/us/app/tampermonkey/id6738342400)

2. Click on the Tampermonkey icon in your browser and select "Create a new script"

3. Delete any default code and paste the entire content of the `video-speed-controller.user.js` file

4. Save the script (Ctrl+S or Cmd+S)

## How to Use

1. Navigate to any website with videos
2. Hover over a video to see the speed controller appear
3. Select a preset speed from the dropdown menu, or
4. Enter a custom speed and click "Apply" or press Enter
5. The controller will automatically hide when you move your mouse away from the video

## Technical Details

- The script uses unique CSS class names to avoid conflicts with website styles
- It observes DOM changes to handle dynamically loaded videos
- Speed settings are maintained even if the website tries to reset them
- The controller appears in a fixed position relative to the video

## License

This project is open-source and free to use and modify.

## Contributing

Feel free to fork this project and submit pull requests with improvements or new features. 