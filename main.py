# main.py

import pygame

import globals as G
from MainMenu import MenuManager
from Board import Board
from camera import Camera

def main():
    pygame.init()

    WINDOW = pygame.display.set_mode(
        (G.VIRTUALWIDTH, G.VIRTUALHEIGHT)
    )

    MENUMANAGER = MenuManager()
    BOARD = Board()
    CAMERA = Camera()

    clock = pygame.time.Clock()
    FPS: float = 60.0
    dt: float = clock.tick(FPS) / 1000.0

    while G.running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                G.toggleRunning()

            elif G.gamestate == G.GameState.Playing:

                if event.type == pygame.MOUSEWHEEL:
                    if event.y > 0:
                        CAMERA.zoom *= 1.0 + CAMERA.ZOOMSPEED
                    elif event.y < 0:
                        CAMERA.zoom /= 1.0 + CAMERA.ZOOMSPEED

                    CAMERA.zoom = max(
                        CAMERA.MINZOOM,
                        min(CAMERA.zoom, CAMERA.MAXZOOM)
                    )

                elif event.type == pygame.MOUSEBUTTONDOWN:
                    if event.button == 1:
                        mousePos = CAMERA.screen_to_world(event.pos)

                        for piece in reversed(BOARD.pieceDraggables):
                            if piece.contains((int(mousePos[0]), int(mousePos[1]))):
                                BOARD.activePiece = piece
                                break

                elif event.type == pygame.MOUSEBUTTONUP:
                    if event.button == 1:
                        piece = BOARD.activePiece
    
                        if piece is not None and piece.closeToFather():
                            piece.fatherPiece.shouldShow = True
                            BOARD.pieceDraggables.remove(piece)

                        BOARD.activePiece = None

            elif G.gamestate == G.GameState.Menu:
                MENUMANAGER.handleInput(event)

        if G.gamestate == G.GameState.Playing:
            BOARD.update(dt)

        WINDOW.fill((124,124,124,255))
        if G.gamestate == G.GameState.Playing:
            BOARD.render(WINDOW)
        elif G.gamestate == G.GameState.Menu:
            MENUMANAGER.render(WINDOW)
        
        pygame.display.flip()

        dt = clock.tick(FPS) / 1000.0
        # print(f"{clock.get_fps():.2f}")
        print(CAMERA.zoom)

    pygame.quit()

if __name__ == "__main__":
    main()