# EyeTracker
EyeTracker is a gaze tracking tool for web page analysis. Once you put the script tag to your website, you can analyze user's behaviors and interests.  
The script tries to measure gaze position using scroll/touch interactions.  
It refers to the paper below.
- https://static.googleusercontent.com/media/research.google.com/ja//pubs/archive/43224.pdf

## Integration
Put the script tag on your website.
```
<script type="text/javascript" src="eyetracker.js"></script>
<script type="text/javascript">
  EyeTracker.Selector = ".entry";    // Set the target selector
</script>
```

## Sample
### Normal Mode
Open `index.html`.

### Debug Mode
Open `index.html?mode=debug`. Then areas you see will be highlighted.

## Liscence
MIT
