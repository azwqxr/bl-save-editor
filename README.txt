BUILD LOGIC SAVE EDITOR - ITEMS + LOADING FIX

Files:
  js/items.js
    Full item registry generated from the supplied ItemsList data.
    Exposes window.Items and window.BLSE.Items.
    Also registers the runtime module as BLSEModules.items.

  js/loading-fix.js
    Prevents the editor from being permanently trapped behind the loading screen.
    It listens for the main application ready events and has a 20-second emergency
    fallback. It also handles dynamically inserted loading overlays.

INSTALL ORDER:
  1. Load js/items.js before parser/world/renderer/inspector when possible.
  2. Load js/loading-fix.js AFTER main.js (or as the final JavaScript file).

Example:
  <script src="js/items.js"></script>
  ...other editor scripts...
  <script src="main.js"></script>
  <script src="js/loading-fix.js"></script>

The loading fix is deliberately independent of the exact loading-screen HTML.
It recognizes common IDs/classes and [data-loading-screen].
