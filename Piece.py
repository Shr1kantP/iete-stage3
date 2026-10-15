# Piece.py

import pygame
from random import randint
from enum import Enum
from camera import Camera
import globals as G

class EdgeType(Enum):
    FLAT = 0
    TAB = 1
    BLANK = 2

class GridPiece:
    
    __slots__ = {
        "up", "down", "left", "right",
        "shouldShow",
        "gridPos", "pixelPos",
        "image"
    }
    
    def __init__(self, pos: tuple[int, int]) -> None:

        self.up = self.down = self.left = self.right = EdgeType.FLAT 

        # bool for if piece should render
        # true only when associating draggable is "inserted"
        self.shouldShow: bool = False

        self.gridPos: tuple[int, int] = pos
        self.pixelPos: tuple[int, int] = (-1, -1) #Initialized in Board.newBoard()

        self.image: pygame.Surface = pygame.Surface((1,1)) #Initialized in Board.newBoard()
    
    def render(self, surface: pygame.Surface) -> None:
        if not self.shouldShow:
            return
        
        camera = Camera()

        x, y = camera.world_to_screen(self.pixelPos)

        image = pygame.transform.scale_by(
            self.image,
            camera.zoom
        )

        surface.blit(
            image, 
            (
                x - G.pieceSize[0] * camera.zoom, 
                y - G.pieceSize[1] * camera.zoom
            )
        )

    def setImage(self, image: pygame.Surface) -> None:
        self.image = image

class PieceDraggable():

    __slots__ = (
        "pos", "pixelPos",
        "fatherPiece"
    )

    def __init__(self, pos: tuple[int, int], fatherPiece: GridPiece) -> None:

        self.pos = pos 
        self.pixelPos: tuple[int, int] = (
            randint(0, G.VIRTUALWIDTH - G.pieceSize[0]), 
            randint(0, G.VIRTUALHEIGHT - G.pieceSize[1])
        )

        self.fatherPiece: GridPiece = fatherPiece
        
    def update(self) -> None:
        camera = Camera()

        x, y = camera.screen_to_world(
            pygame.mouse.get_pos()
        )

        self.pixelPos = (
            int(x) - G.pieceSize[0] // 2,
            int(y) - G.pieceSize[1] // 2
        )

    def render(self, surface: pygame.Surface) -> None:
        camera = Camera()

        x, y = camera.world_to_screen(self.pixelPos)

        fp = self.fatherPiece

        image = pygame.transform.scale_by(
            fp.image,
            camera.zoom
        )

        surface.blit(
            image, 
            (
                x - G.pieceSize[0] * camera.zoom,
                y - G.pieceSize[1] * camera.zoom
            )
        )

    def contains(self, mousePos: tuple[int, int]) -> bool:
        mx, my = mousePos
        x, y = self.pixelPos

        return (x <= mx < x + G.pieceSize[0] and y <= my < y + G.pieceSize[1])
    
    def closeToFather(self) -> bool:
        LENIENCY = max(G.pieceSize[0], G.pieceSize[1]) // 2

        px, py = self.pixelPos
        fx, fy = self.fatherPiece.pixelPos

        piece_center = (
            px + G.pieceSize[0] // 2,
            py + G.pieceSize[1] // 2,
        )

        father_center = (
            fx + G.pieceSize[0] // 2,
            fy + G.pieceSize[1] // 2,
        )

        return (
            abs(piece_center[0] - father_center[0]) <= LENIENCY and
            abs(piece_center[1] - father_center[1]) <= LENIENCY
        )