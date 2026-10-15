import pygame
from enum import Enum

VIRTUALWIDTH = 1280
VIRTUALHEIGHT = 720

pieceSize: tuple[int, int] = (50, 50)
def setPieceSize(size: tuple[int, int]):
    global pieceSize
    pieceSize = size

running: bool = True
def toggleRunning():
    global running
    running = not running


class GameState(Enum):
    Menu = 0
    Playing = 1

gamestate = GameState.Menu
def setGameState(state: GameState):
    global gamestate
    gamestate = state


currentImage: pygame.Surface | None = None
gridSize: tuple[int, int] = (2, 2)

