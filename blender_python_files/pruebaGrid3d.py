import numpy as np

# Definir las dimensiones del grid
size = 15  # Cada lado del cubo tiene 15 puntos
spacing = 0.2  # La distancia entre dos puntos es de 0.2 unidades

# Crear tres vectores de coordenadas X, Y, Z
x = np.linspace(start = 0, stop = 3, num = 16)
y = x
z = x

# Crear el grid 3D con meshgrid y apilar filas con vstack
X, Y, Z = np.meshgrid(x, y, z)
grid = np.vstack([X.ravel(), Y.ravel(), Z.ravel()]).T.tolist()

# Imprimir el grid
#print(grid)