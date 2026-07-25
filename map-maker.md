Below are a number of stories to implement. 
Implement them one at a time and in ascending order.
Starting from story 1, create/update an instructions file on 'map-maker' to keep track of its functionalities, structure, etc

# 0. Rework app routing and menu
- New main/starting page is vertically divided in four sections:
- - Campaign maps
- - DnD: Shop generator
- - Starfinder 
- - Dungeon builder

The menu is not shown on the starting page.
On other pages, it is shown and follows the structure of the main page to show its items, with submenus to show sub items.

The dungeon builder page leads to a placeholder for now. The others already exist

# 1. Drawing tool
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

