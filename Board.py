# Board.py

import pygame
import globals as G

from Piece import PieceDraggable, GridPiece, EdgeType
from random import getrandbits
from enum import Enum
from camera import Camera

class BoardSize(Enum):
    TINY = (2, 2)
    SMALL = (4, 4)
    MEDIUM = (8, 8)
    LARGE = (16, 16)

class Board:
    _instance = None

    __slots__ = (
        "gridSize", 
        "pieces", "pieceDraggables",
        "activePiece",
        "imageSize", "startPos",
        "tab", "tabs",
        "completed", "completedTimer"
    )

    GAP: int = 0

    def __init__(self) -> None:
        self.gridSize: tuple[int, int] = (-1, -1)
        self.pieces: list[GridPiece] = []
        
        self.pieceDraggables: list[PieceDraggable] = []
        self.activePiece: PieceDraggable | None = None

        self.imageSize: tuple[int, int] = (-1, -1)
        self.startPos: tuple[int, int] = (-1, -1)

        self.tab: pygame.Surface = pygame.image.load("asset/tab.png").convert_alpha()
        self.tabs: dict[str, pygame.Surface] = {}
        
        self.completed = False
        self.completedTimer = 0.0

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def newBoard(self, image: pygame.Surface, size: tuple[int, int]) -> None:
        
        if size[0] >= 0 and size[1] >= 0:
            self.gridSize = size

        self.pieces.clear()
        self.pieceDraggables.clear()
        self.imageSize = image.get_size()

        cellWidth = self.imageSize[0] // self.gridSize[0]
        cellHeight = self.imageSize[1] // self.gridSize[1]

        G.setPieceSize((cellWidth, cellHeight))

        scaled = pygame.transform.scale(self.tab, (cellWidth, cellHeight))
        self.tabs = {
            "up": scaled,
            "down": pygame.transform.scale(pygame.transform.rotate(scaled, 180), (cellWidth, cellHeight)),
            "left": pygame.transform.scale(pygame.transform.rotate(scaled,  90), (cellWidth, cellHeight)),
            "right": pygame.transform.scale(pygame.transform.rotate(scaled, -90), (cellWidth, cellHeight))
        }

        for y in range(self.gridSize[1]):
            for x in range(self.gridSize[0]):
                # rect = pygame.Rect(x * cellWidth, y * cellHeight, cellWidth, cellHeight)
                self.pieces.append(GridPiece((x, y)))

        board_width = self.gridSize[0] * cellWidth + (self.gridSize[0] - 1) * Board.GAP
        board_height = self.gridSize[1] * cellHeight + (self.gridSize[1] - 1) * Board.GAP

        start_x = (G.VIRTUALWIDTH - board_width) // 2
        start_y = (G.VIRTUALHEIGHT - board_height) // 2
        
        self.startPos = (start_x, start_y)

        marginalizedImage = pygame.Surface(
            (image.get_width() + cellWidth * 2, image.get_height() + cellHeight * 2), 
            pygame.SRCALPHA
        )
        marginalizedImage.blit(image, (cellWidth, cellHeight))

        for cy in range(self.gridSize[1]):
            for cx in range(self.gridSize[0]):
                piece = self.get((cx, cy))
                
                piece.pixelPos = (
                    start_x + cx * (cellWidth + Board.GAP),
                    start_y + cy * (cellHeight + Board.GAP),
                )

                piece.left  =  EdgeType.FLAT if (cx == 0) else EdgeType.TAB
                piece.right = EdgeType.FLAT if (cx == self.gridSize[0] - 1) else EdgeType.TAB
                piece.up    = EdgeType.FLAT if (cy == 0) else EdgeType.TAB
                piece.down  = EdgeType.FLAT if (cy == self.gridSize[1] - 1) else EdgeType.TAB

                if not piece.left == EdgeType.FLAT:
                    left = self.get((cx - 1, cy))
                    
                    if left.right == EdgeType.BLANK:
                        piece.left = EdgeType.TAB
                    else:
                        piece.left = EdgeType.BLANK

                if not piece.up == EdgeType.FLAT:
                    above = self.get((cx, cy - 1))

                    if above.down == EdgeType.BLANK:
                        piece.up = EdgeType.TAB
                    else:
                        piece.up = EdgeType.BLANK

                if not piece.right == EdgeType.FLAT:
                    piece.right = EdgeType.BLANK if bool(getrandbits(1)) else EdgeType.TAB

                if not piece.down == EdgeType.FLAT:
                    piece.down = EdgeType.BLANK if bool(getrandbits(1)) else EdgeType.TAB
                
                # creating mask for piece
                texture = pygame.Surface((cellWidth * 3, cellHeight * 3), pygame.SRCALPHA)
                texture.fill((0, 0, 0, 255), (cellWidth, cellHeight, cellWidth, cellHeight))

                    #UP
                if piece.up != EdgeType.FLAT:
                    if piece.up == EdgeType.TAB:
                        tabUp: pygame.Surface = self.tabs["up"]

                        for x in range(cellWidth):
                            for y in range(cellHeight):
                                texture.set_at(
                                    (cellWidth + x, y),
                                    tabUp.get_at((x,y))
                                )

                    else:
                        tabDown: pygame.Surface = self.tabs["down"]

                        for x in range(cellWidth):
                            for y in range(cellHeight):
                                if tabDown.get_at((x,y)).a != 0:
                                    texture.set_at(
                                        (cellWidth + x, cellHeight + y),
                                        (0,0,0,0)
                                    )
                    #DOWN
                if piece.down != EdgeType.FLAT:
                    if piece.down == EdgeType.TAB:
                        tabDown: pygame.Surface = self.tabs["down"]

                        for x in range(cellWidth):
                            for y in range(cellHeight):
                                texture.set_at(
                                    (cellWidth + x, y + cellHeight * 2),
                                    tabDown.get_at((x,y))
                                )

                    else:
                        tabUp: pygame.Surface = self.tabs["up"]

                        for x in range(cellWidth):
                            for y in range(cellHeight):
                                if tabUp.get_at((x,y)).a != 0:
                                    texture.set_at(
                                        (cellWidth + x, cellHeight + y),
                                        (0,0,0,0)
                                    )
                    #LEFT
                if piece.left != EdgeType.FLAT:
                    if piece.left == EdgeType.TAB:
                        tabLeft: pygame.Surface = self.tabs["left"]

                        for x in range(cellWidth):
                            for y in range(cellHeight):
                                texture.set_at(
                                    (x, cellHeight + y),
                                    tabLeft.get_at((x,y))
                                )

                    else:
                        tabRight: pygame.Surface = self.tabs["right"]

                        for x in range(cellWidth):
                            for y in range(cellHeight):
                                if tabRight.get_at((x,y)).a != 0:
                                    texture.set_at(
                                        (cellWidth + x, cellHeight + y),
                                        (0,0,0,0)
                                    )
                    #RIGHT
                if piece.right != EdgeType.FLAT:
                    if piece.right == EdgeType.TAB:
                        tabRight: pygame.Surface = self.tabs["right"]

                        for x in range(cellWidth):
                            for y in range(cellHeight):
                                texture.set_at(
                                    (cellWidth * 2 + x, cellHeight + y),
                                    tabRight.get_at((x,y))
                                )

                    else:
                        tabLeft: pygame.Surface = self.tabs["left"]

                        for x in range(cellWidth):
                            for y in range(cellHeight):
                                if tabLeft.get_at((x,y)).a != 0:
                                    texture.set_at(
                                        (cellWidth + x, cellHeight + y),
                                        (0,0,0,0)
                                    )
                
                # goal is to take 3x3 grids out of marginalizedImage
                # paste the marginalizedImage onto the black parts of texture

                SubsurfaceRect = pygame.Rect(cx * cellWidth, cy * cellHeight, cellWidth * 3, cellHeight * 3)
                imageSubsurface = imageSubsurface = marginalizedImage.subsurface(SubsurfaceRect).copy()

                for x in range(cellWidth * 3):
                    for y in range(cellHeight * 3):
                        if texture.get_at((x, y)).a != 0:
                            texture.set_at(
                                (x, y),
                                imageSubsurface.get_at((x, y))
                            )
                piece.setImage(texture)

                self.pieceDraggables.append(
                    PieceDraggable(
                        (cx, cy),
                        piece
                    )
                )

    def get(self, pos: tuple[int, int]) -> GridPiece:
        x, y = pos
        width, height = self.gridSize

        if not (0 <= x < width and 0 <= y < height): 
            raise IndexError(
                f"Board.get | Position {pos} is out of bounds for grid size {self.gridSize}"
            )
        return self.pieces[y * width + x]
    
    def update(self, dt: float) -> None:
        if self.activePiece:
            self.activePiece.update()

        if not self.completed and len(self.pieceDraggables) == 0:
            self.completed = True
            self.completedTimer = 0.0

        if self.completed:
            self.completedTimer += dt

            # After 7 seconds return to menu
            if self.completedTimer >= 7.0:
                self.completed = False
                G.setGameState(G.GameState.Menu)


    def render(self, surface: pygame.Surface) -> None:
        for piece in self.pieces:
            if piece.shouldShow:
                piece.render(surface)

        for piece in self.pieceDraggables:
            piece.render(surface)

        camera = Camera()

        cols, rows = self.gridSize
        cell_w, cell_h = G.pieceSize

        cell_w *= camera.zoom
        cell_h *= camera.zoom
        gap = self.GAP * camera.zoom

        start_x, start_y = camera.world_to_screen(self.startPos)

        color = (200, 200, 200)  # light gray grid lines

        for x in range(cols + 1):
            px = start_x + x * (cell_w + gap) - gap // 2
            pygame.draw.line(
                surface,
                color,
                (px, start_y),
                (px, start_y + rows * (cell_h + gap) - gap),
                1
            )

        for y in range(rows + 1):
            py = start_y + y * (cell_h + gap) - gap // 2
            pygame.draw.line(
                surface,
                color,
                (start_x, py),
                (start_x + cols * (cell_w + gap) - gap, py),
                1
            )

        if self.completed and self.completedTimer >= 2.0:
            font = pygame.font.SysFont(None, 72)

            text = font.render("Congratulations!", True, (255, 255, 255))
            rect = text.get_rect(center=(G.VIRTUALWIDTH // 2, G.VIRTUALHEIGHT // 2))

            surface.blit(text, rect)