import sys
import os
import time
import webbrowser
import subprocess
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QFileDialog, QPushButton,
    QVBoxLayout, QWidget, QLabel
)
from PyQt5.QtCore import Qt
from Converter import process_xml
from http.server import SimpleHTTPRequestHandler
from socketserver import TCPServer
import threading
import convert_excel_to_json


def get_visualizer_path():
    if getattr(sys, 'frozen', False):
        base_path = os.path.dirname(sys.executable)
    else:
        base_path = os.path.abspath(os.path.dirname(__file__))
    return os.path.join(base_path, "visualizer")


class ServerThread(threading.Thread):
    def run(self):
        try:
            projekt_verzeichnis = os.path.abspath(os.path.dirname(__file__))
            os.chdir(projekt_verzeichnis)
            handler = SimpleHTTPRequestHandler
            with TCPServer(("", 8000), handler) as httpd:
                print("🌐 Server läuft unter http://localhost:8000")
                httpd.serve_forever()
        except Exception as e:
            print(f"❌ Fehler beim Starten des Servers: {e}")


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("XML zu JSON Konverter")
        self.setGeometry(100, 100, 450, 250)

        zentral_widget = QWidget(self)
        self.setCentralWidget(zentral_widget)
        layout = QVBoxLayout(zentral_widget)

        self.label = QLabel("Ziehen Sie eine XML-Datei hierher oder klicken Sie auf 'Datei wählen'", self)
        self.label.setAlignment(Qt.AlignCenter)
        layout.addWidget(self.label)

        self.load_button = QPushButton("📂 XML-Datei wählen", self)
        self.load_button.clicked.connect(self.select_file)
        layout.addWidget(self.load_button)

        self.xml_info_label = QLabel("", self)
        self.xml_info_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(self.xml_info_label)

        self.visualize_button = QPushButton("📊 Visualisierung anzeigen", self)
        self.visualize_button.setEnabled(False)
        self.visualize_button.clicked.connect(self.show_visualization)
        layout.addWidget(self.visualize_button)

        self.setAcceptDrops(True)
        self.letzte_json_datei = None

        self.server_thread = ServerThread()
        self.server_thread.daemon = True
        self.server_thread.start()

    def dragEnterEvent(self, event):
        if event.mimeData().hasUrls():
            event.acceptProposedAction()

    def dropEvent(self, event):
        for url in event.mimeData().urls():
            dateipfad = url.toLocalFile()
            self.verarbeite_datei(dateipfad)

    def select_file(self):
        dateipfad, _ = QFileDialog.getOpenFileName(self, "XML-Datei auswählen", "", "XML Dateien (*.xml *.gen)")
        if dateipfad:
            self.verarbeite_datei(dateipfad)

    def verarbeite_datei(self, dateipfad):
        output_dir = get_visualizer_path()
        process_xml(dateipfad, output_dir)
        self.xml_info_label.setText(f"✅ Datei '{os.path.basename(dateipfad)}' wurde erfolgreich verarbeitet.")
        self.letzte_json_datei = os.path.join("visualizer", "graph_data.json")
        self.visualize_button.setEnabled(True)

        # Excel-Konvertierung im Hintergrund nach dem Parsen
        if convert_excel_to_json.convert_excel_to_json():
            with open(os.path.join(output_dir, "specification.json"), "r", encoding="utf-8") as f:
                spec = f.read()
                # print("🔍 Geladene Excel-Spezifikation:")
                # print(spec)

    def show_visualization(self):
        if self.letzte_json_datei:
            timestamp = int(time.time())
            url = f"http://localhost:8000/index.html?file={self.letzte_json_datei}&nocache={timestamp}"
            webbrowser.open(url)


if __name__ == "__main__":
    app = QApplication(sys.argv)
    fenster = MainWindow()
    fenster.show()
    sys.exit(app.exec_())
