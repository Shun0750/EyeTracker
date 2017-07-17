# EyeTracker
EyeTracker is a tracking tool for web page analysis. Once you put the script tag to your website, you can analyze user's behaviors and interests.

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

### Debug Motde
Open `index.html?mode=debug`. Then areas you see will be highlighted.
