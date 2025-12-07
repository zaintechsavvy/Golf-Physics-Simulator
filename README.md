# Golf Physics Simulator

This is an interactive 2D golf simulator built with Next.js and React. It allows you to visualize projectile motion physics by adjusting various parameters and observing the outcome.

## How to Use the Simulator

### 1. Adjust Physics Parameters
On the right side of the screen, you'll find the **Physics Controls** card. Here you can modify the environment and the ball's properties:
- **Initial Velocity**: Sets the speed at which the ball is launched (in meters/second).
- **Gravity**: Choose from presets like Earth, Moon, or Mars, or select "Custom" to set a specific gravitational acceleration.
- **Ball Mass**: Adjust the mass of the golf ball (in kilograms).
- **Air Resistance**: Toggle air resistance on or off. When enabled, you can also set the **Drag Coefficient**.
- **Start Height**: Use this slider to simulate hitting from an elevated tee, allowing you to practice uphill and downhill shots.

### 2. Set the Launch Angle
You can set the launch angle in two ways:
- Use the **Launch Angle** slider on the right side.
- Click and drag the large orange arrow on the course itself.

### 3. Swing!
Once you're satisfied with your parameters, click the big **Swing** button at the bottom of the screen to launch the ball. The simulation will begin, and the camera will follow the ball's flight.

### 4. Observe and Control the Simulation
- **Data Overlay**: At the top of the screen, you'll see a live display of statistics like flight time, distance, and max height.
- **Simulation Controls**:
  - **Pause/Play**: Pause or resume the simulation while the ball is in flight.
  - **Slow Motion**: Toggle between normal and slow motion speed.
  - **Reset**: Stop the current simulation and return the ball to the tee.

### 5. Store and Analyze Data
- **Store Run**: After the ball lands, the **Store** button will become active. Click it to save the parameters and results of that shot.
- **View Stored Data**: Click the **Sheet Icon** button in the control panel to open a dialog containing a table of all your stored runs. This is great for comparing different shots.
- **Export to CSV**: Inside the data table dialog, click the **Export to CSV** button to download all your stored run data as a CSV file, which you can open in any spreadsheet software.
- **Clear Data**: You can clear all stored runs from the table by clicking the "Clear Data" button.

### 6. Control the Camera
- **Zoom**: Use the **Zoom In** and **Zoom Out** buttons in the top-left corner.
- **Pan**: Click and drag anywhere on the course background to pan the camera and explore the environment.

### 7. Tutorial
If you ever need a refresher, click the **Help** button (question mark icon) in the top-left corner to restart the interactive tutorial.
