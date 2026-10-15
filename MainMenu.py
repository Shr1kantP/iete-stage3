# MainMeny.py

import pygame
import tkinter as tk
from tkinter import filedialog
from pathlib import Path
import globals as G
from Board import Board, BoardSize

S_ROOT = tk.Tk()
S_ROOT.withdraw()

class MainMenu:
    _instance = None

    def __init__(self) -> None:
        self.options = ["New Puzzle", "Quit"]
        self.selectedIndex = 0

        self.titleFont = pygame.font.Font(None, 96)
        self.optionFont = pygame.font.Font(None, 56)

        self.prevUp = False
        self.prevDown = False
        self.prevEnter = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def handleInput(self, event: pygame.event.Event):
        self.prevUp = False
        self.prevDown = False
        self.prevEnter = False

        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_w and not self.prevUp:
                self.selectedIndex = ((self.selectedIndex - 1) % len(self.options))
                self.prevUp = True

            elif event.key == pygame.K_s and not self.prevDown:
                self.selectedIndex = ((self.selectedIndex + 1) % len(self.options))
                self.prevDown = True

            elif (event.key == pygame.K_RETURN or event.key == pygame.K_e) and not self.prevEnter:
                option: str = self.options[self.selectedIndex]

                if option == self.options[0]: # new puzzle
                    G.currentImage = None
                    G.gridSize = (2, 2)
                    manager = MenuManager()
                    puzzelselectmenu = PuzzleSelectMenu()
                    manager.setCurrentMenu(puzzelselectmenu)

                if option == self.options[1]: # Quit
                    G.toggleRunning()

                self.prevEnter = True

    def render(self, surface: pygame.Surface):
        
        titleCardPosCenter = (G.VIRTUALWIDTH // 2, 150)

        titleCard = self.titleFont.render("Puzzle Game", True, (255,255,255,255))
        titleRect = titleCard.get_rect(center=titleCardPosCenter)
        surface.blit(titleCard, titleRect)

        optionsCenter = (G.VIRTUALWIDTH // 2, 400)
        spacingY = 70

        for i, option in enumerate(self.options):
            selected = (i == self.selectedIndex)

            color = (255, 255, 0, 255) if selected else (255, 255, 255, 255)

            text = self.optionFont.render(option, True, color)
            rect = text.get_rect(
                center=(
                    optionsCenter[0], 
                    optionsCenter[1] + i * spacingY
                )
            )

            surface.blit(text, rect)

class PuzzleSelectMenu:
    _instance = None

    def __init__(self):
        self.options = [
            "Start", 
            "Selected Puzzle: None", 
            "Selected Size: 2x2", 
            "Back"
        ]
        self.selectedIndex = 0

        self.optionFont = pygame.font.Font(None, 56)

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def handleInput(self, event: pygame.event.Event):
        self.prevUp = False
        self.prevDown = False
        self.prevEnter = False

        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_w and not self.prevUp:
                self.selectedIndex = ((self.selectedIndex - 1) % len(self.options))
                self.prevUp = True

            elif event.key == pygame.K_s and not self.prevDown:
                self.selectedIndex = ((self.selectedIndex + 1) % len(self.options))
                self.prevDown = True

            elif (event.key == pygame.K_RETURN) or (event.key == pygame.K_e) and not self.prevEnter:
                option: str = self.options[self.selectedIndex]

                if option == self.options[0]:
                    board = Board()
                    
                    if G.currentImage == None:
                        return
                    
                    board.newBoard(G.currentImage, G.gridSize)
                    G.setGameState(G.GameState.Playing)

                elif option == self.options[1]: # Select puzzle
                    initialDir = Path(__file__).resolve().parent / "images"
                    
                    selectedFilePath = filedialog.askopenfilename(
                        initialdir=initialDir,
                        title= "Select Image",
                        filetypes=[("Image Files", "*.png *.jpg *.jpeg *.bmp")]
                    )

                    if selectedFilePath:
                        G.currentImage = pygame.image.load((selectedFilePath))

                        while (
                            G.currentImage.get_width() > G.VIRTUALWIDTH or 
                            G.currentImage.get_height() > G.VIRTUALHEIGHT
                            ):

                            G.currentImage = pygame.transform.scale(
                                G.currentImage, (
                                    G.currentImage.get_width() // 2,
                                    G.currentImage.get_height() // 2
                                    )
                            )

                        name = selectedFilePath

                        lastSlashIndex = -1
                        for i, char in enumerate(selectedFilePath):
                            if char == "/":
                                lastSlashIndex = i

                        if lastSlashIndex != -1:
                            name = selectedFilePath[(lastSlashIndex + 1):]

                        self.options[1] = f"Selected Puzzle: {name}"
                    
                elif option == self.options[2]: # Select Size
                    tiny = BoardSize.TINY.value
                    small = BoardSize.SMALL.value
                    medium = BoardSize.MEDIUM.value
                    large = BoardSize.LARGE.value

                    if G.gridSize == tiny:
                        G.gridSize = small
                        self.options[2] = "Selected Size: 4x4"

                    elif G.gridSize == small:
                        G.gridSize = medium
                        self.options[2] = "Selected Size: 8x8"
                    
                    elif G.gridSize == medium:
                        G.gridSize = large
                        self.options[2] = "Selected Size: 16x16"
                    
                    elif G.gridSize == large:
                        G.gridSize = tiny
                        self.options[2] = "Selected Size: 2x2"

                elif option == self.options[3]: # Back
                    manager = MenuManager()
                    main = MainMenu()
                    manager.setCurrentMenu(main)

                self.prevEnter = True

    def render(self, surface: pygame.Surface):
        optionsCenter = (G.VIRTUALWIDTH // 2, 400)
        spacingY = 70

        for i, option in enumerate(self.options):
            selected = (i == self.selectedIndex)

            color = (255, 255, 0, 255) if selected else (255, 255, 255, 255)

            text = self.optionFont.render(option, True, color)
            rect = text.get_rect(
                center=(
                    optionsCenter[0], 
                    optionsCenter[1] + i * spacingY
                )
            )

            surface.blit(text, rect)


class MenuManager:
    _instance = None

    def __init__(self) -> None:
        self.currentMenu: MainMenu | PuzzleSelectMenu = MainMenu()

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def setCurrentMenu(self, menu: MainMenu | PuzzleSelectMenu) -> None:
        self.currentMenu = menu

    def handleInput(self, event: pygame.event.Event):
        self.currentMenu.handleInput(event)

    def render(self, surface: pygame.Surface):
        self.currentMenu.render(surface)