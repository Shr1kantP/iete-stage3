# Camera.py

import globals as G

class Camera:
    _instance = None

    MINZOOM = 0.25
    MAXZOOM = 4.0
    ZOOMSPEED = 0.1

    def __init__(self) -> None:  
        if hasattr(self, "_initialized"):
            return
              
        self.zoom = 1.0
        self._initialized = True

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def world_to_screen(self, pos: tuple[int, int]):
        cx, cy = G.VIRTUALWIDTH / 2, G.VIRTUALHEIGHT / 2
        return (
            cx + (pos[0] - cx) * self.zoom,
            cy + (pos[1] - cy) * self.zoom
        )

    def screen_to_world(self, pos: tuple[int, int]):
        cx, cy = G.VIRTUALWIDTH / 2, G.VIRTUALHEIGHT / 2
        return (
            cx + (pos[0] - cx) / self.zoom,
            cy + (pos[1] - cy) / self.zoom
        )