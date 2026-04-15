from PIL import Image

def remove_white(img_path):
    try:
        img = Image.open(img_path).convert("RGBA")
        data = img.getdata()

        new_data = []
        # tolerance for white
        for item in data:
            if item[0] >= 225 and item[1] >= 225 and item[2] >= 225:
                # Calculate an alpha based on distance from white to give an anti-aliased edge
                avg = (item[0] + item[1] + item[2]) / 3
                if avg >= 250:
                    new_data.append((255, 255, 255, 0))
                else:
                    # Partial transparency for edge pixels to avoid sharp aliasing
                    alpha = int((250 - avg) * (255 / 25))
                    new_data.append((item[0], item[1], item[2], alpha))
            else:
                new_data.append(item)

        img.putdata(new_data)
        img.save(img_path, "PNG")
        print("Success")
    except Exception as e:
        print("Error:", e)

remove_white('public/logo.png')
