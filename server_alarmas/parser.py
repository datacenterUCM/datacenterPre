import argparse

parser = argparse.ArgumentParser(description="Programa que prepara el texto de entrada para ser insertado en influxDB. Sustituye los espacios por _ y pone un \ antes de las comas.")
parser.add_argument("-t", "--text", required=True, help="Texto de entrada")
args = parser.parse_args()

text = args.text

#Añadir \ antes de las comas:

newText = text.replace(',', '\,')


print( newText.replace(" ", "_") )