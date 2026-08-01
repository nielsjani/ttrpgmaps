Below are a number of stories to implement. 
Implement them one at a time and in ascending order.
Starting from story 1, create/update an instructions file on 'map-maker' to keep track of its functionalities, structure, etc

# 0. Rework app routing and menu - DONE
- New main/starting page is vertically divided in four sections:
- - Campaign maps
- - DnD: Shop generator
- - Starfinder 
- - Dungeon builder

The menu is not shown on the starting page.
On other pages, it is shown and follows the structure of the main page to show its items, with submenus to show sub items.

The dungeon builder page leads to a placeholder for now. The others already exist

# 1. Drawing tool - DONE
Begin implementing a map making tool for dungeons in a ttrpg.
Use the map maker page created in story 0.
User gets an infinite white canvas to draw on. It is populated with a grid of squares.
While holding down the left mouse button, he can pan the map around.

User can select a 'square' tool (icon) in a sidebar (or using shortcut 's')
If this tool is active, the user can draw squares on the map. The square are the same size as the squares already drawn on the grid and use the same positions when drawn
User can choose the color of the drawn squares using a color picker. Some defaults are provided.
If two drawn squares share an edge, they are merged into a single larger square. 
You can also fill half or quarter squares or diagonal halves (aka triangles) by selecting the appropriate option in the sidebar.

The user can also select a 'delete' tool (icon) in the sidebar (or using shortcut 'd') to remove squares from the map.

You can zoom in and out using the mouse wheel or using a slider in the sidebar.

# 2. Adding text - DONE
New tool in the toolbar.
User can select a text tool (icon) in the sidebar (or using shortcut 't')
User can draw text on the map.
User can later edit the text or move it
User can scale the text so the font size changes and can change the size of the text block so text is on one or multiple lines if it would get too long

# 3. Adding doors - DONE
User can select a door tool (icon) in the sidebar (or using shortcut 'd')
User can select the (horizontal or vertical) edge of two squares that are not empty. The edge will light up when hovering over it.
A door icon will appear on the selected edge. 
Clicking on an existing door will remove it.
A door icon looks like a simple white rectangle with a black border.

# 4. Adding art assets - DONE
User can select an art tool (icon) in the sidebar (or using shortcut 'a').
This will show a list of art assets that can be added to the map.
User can filter these assets by name
Import the first batch of assets from "C:\Users\nielsj\Downloads\Furniture Map Assets\Assets - 300 DPI (Print)"
The names of the assets in the dropdown are the same as the filenames.
Categorize these assets under 2minutetabletop. More categories might be added later and a user can then filter by author (== category).
Once an asset is selected, it will be added to the map after clicking somewhere on the map.
It can be moved around by clicking and dragging it.
It can be scaled by clicking and dragging the bottom right corner.
It can be rotated by clicking and dragging the bottom left corner.

# 5. Design vs play mode - DONE
User can switch between design mode and play mode.
All stories so far were about design mode
In Play mode, most of the tools are disabled.
You can still move the map around and zoom in and out.
Once play mode is enabled, a second screen pops out.
The popped out screen is the player-view
The original screen is the dungeon master-view.
These screens need to communicate with each other.

In play mode, the dungeon-master view can place a circular icon on the map. The color can be chosen. 
This icon is 'the party'.
Both the player-view and the dungeon-master-view can see and move the party icon.
Additional icons can be split off from the party icon. These are 'player icons' and each have their own color. A name can be optionally provided to each one of these.

# 6. Save and load - DONE
User can save the map to a file.
User can load a map from a file.
All data from both design and play mode is saved/loaded.
All features added in future stories will be saved/loaded.

# 7. Hidden areas - DONE
In design mode, the user can designate certain areas of the map as 'hidden'.
These areas are not shown in the player-view.
Each of these hidden areas gets assigned a letter (A, B, C, etc.). This name can be overridden.

In play mode, the player-view shows the hidden areas as black-bordered squares. Also all space between shown areas is black-bordered.
In play mode, the dungeon-master can reveal certain areas by clicking on the corresponding letter.
The hidden areas are always visible in the dungeon-master-view but are only visible in the player-view when the corresponding letter is clicked by the dungeon master.
The system will help the dungeon master indicating an area. An area is a collection of squares that are all connected to each other and are separated to the empty grid by a border or door(s).

# 8. Hidden doors - DONE
In design mode, the user can designate certain doors as 'hidden'.
These doors appear as regular black-bordered edges in the player-view.
The dungeon-master can reveal these doors by clicking on the corresponding door icon in dungeon master view.

Similarly, certain art assets can be designated as hidden and can be revealed by the dungeon master.

# 9. Draw large squares
User can draw large squares by clicking on the square tool and then clicking and dragging the mouse while holding down the ctrl button.
The screen will show the size in width and height of the square being drawn while the mouse is being dragged.

# 10. Undo/redo
User can undo/redo the last actions.
Undo/redo is implemented in the dungeon-master view.
Can be toggled by using the buttons in the sidebar (left and right arrow) or by pressing left or right arrow keys.

# 11. Additional art assets
Similar to story 4.
Add the assets to the 'TomCartos' category.
See 'C:\Users\nielsj\Downloads\myairbridge-TC_Basics Asset Pack\TC_Basics Asset Pack' for the files

# 12. Copying placed art assets
Keeps the size, rotation and position of the art asset when copied, but places it two squares to the right of the original.

# 13. Textured colors
When drawing squares, the user can select a texture instead of a color. The textures are provided as images and can be tiled to fill the square.

# 14. Add notes to a room
New tool in the toolbar.
User can select a note tool (icon) in the sidebar (or using shortcut 'n')
User can select a room (room as defined in story 7). A form on the right hand side will appear.
User can fill in text areas
- Room name (simple input)
- Description
- Secrets
- Loot 
- Enemies
- NPCs
- Other
All of these text areas need to allow hyperlinks to be added
In play mode, these notes are only visible to the dungeon master. Empty notes are not shown here.
