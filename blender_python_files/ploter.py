import matplotlib.pyplot as plt
#from mpl_toolkits.mplot3d import Axes3D
import numpy as np

class Ploter:

    def __init_():
        pass

    def plot3D(self, points, data):
        #Se obtienen 3 listas separadas para cada coordenada
        points = np.array(points)
        x = points[:, 0]
        y = points[:, 1]
        z = points[:, 2]

        # Crea una figura en 3D
        fig = plt.figure()
        ax = fig.add_subplot(111, projection='3d')

        # Plotear los puntos en 3D
        ax.scatter(x, y, z, c='r', marker='o')

        # Agregar etiquetas a los ejes
        ax.set_xlabel('Eje X')
        ax.set_ylabel('Eje Y')
        ax.set_zlabel('Eje Z')

        # Mostrar la gráfica
        plt.show()



