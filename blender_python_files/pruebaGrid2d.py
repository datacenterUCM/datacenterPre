#######################
##CREAR UN GRID CUADRADO DE 3 UNIDADES (ARRAY DE ARRAYS) CON PUNTOS EQUIDISTANTES EN 0.2 UNIDADES
#######################

import numpy as np

# Definir las dimensiones del grid
size = 16  # Cada lado del cuadrado tiene 16 puntos
spacing = 0.2  # La distancia entre dos puntos es de 0.2 unidades

# Crear dos vectores de coordenadas X e Y
# np.linspace crea un array de puntos equidistantes dado un inicio, un fin y un número de puntos
x = np.linspace(start = 0, stop = 3, num = 16)
y = x
z = 1

# Crear el grid 2D con meshgrid y apilar filas con vstack

#TODO: AÑADIR UNA TERCERA DIMENSIÓN AL GRID
grid = np.vstack(np.meshgrid(x, y)).reshape(2, -1).T.tolist()

# Imprimir el grid
print(grid)
