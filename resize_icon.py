from PIL import Image
import os
import sys

def resize_icon(input_path, output_dir='icons'):
    """
    Resize an input icon to the required sizes for Chrome extension.
    Creates the output directory if it doesn't exist.
    
    Args:
        input_path (str): Path to the input icon image
        output_dir (str): Directory to save resized icons (default: 'icons')
    """
    # Required sizes for Chrome extension
    sizes = [16, 48, 128]
    
    try:
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Open the input image
        with Image.open(input_path) as img:
            # Convert to RGBA if not already (to handle transparency)
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
                
            # Resize for each required size
            for size in sizes:
                # Create a new image with the target size and transparent background
                resized_img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
                
                # Calculate dimensions to maintain aspect ratio
                ratio = min(size / img.width, size / img.height)
                new_width = int(img.width * ratio)
                new_height = int(img.height * ratio)
                
                # Resize the image while maintaining aspect ratio
                resized_temp = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                
                # Calculate position to center the image
                x = (size - new_width) // 2
                y = (size - new_height) // 2
                
                # Paste the resized image onto the transparent background
                resized_img.paste(resized_temp, (x, y), resized_temp)
                
                # Save the resized image
                output_path = os.path.join(output_dir, f'icon{size}.png')
                resized_img.save(output_path, 'PNG')
                print(f'Saved: {output_path}')
                
        print('\nAll icons have been resized and saved successfully!')
        print('Make sure your manifest.json points to these files:')
        print('  "icons/icon16.png"')
        print('  "icons/icon48.png"')
        print('  "icons/icon128.png"')
        
    except Exception as e:
        print(f'Error: {str(e)}')
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: python resize_icon.py <input_icon_path> [output_directory]')
        print('Example: python resize_icon.py my_icon.png icons')
        sys.exit(1)
        
    input_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else 'icons'
    
    resize_icon(input_path, output_dir)
