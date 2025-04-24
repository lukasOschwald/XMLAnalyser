import os
import pandas as pd
import json
import logging
import sys

# Logging-Konfiguration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

def get_visualizer_path():
    """
    Bestimmt den Pfad zum Ordner 'visualizer' relativ zum Ausführungsort.
    Beim Kompilieren (z. B. mit PyInstaller) wird der Pfad relativ zu sys.executable bestimmt,
    beim Start in der IDE relativ zu __file__.
    """
    if getattr(sys, 'frozen', False):
        base_path = os.path.dirname(sys.executable)
    else:
        base_path = os.path.abspath(os.path.dirname(__file__))
    return os.path.join(base_path, "visualizer")

def convert_excel_to_json():
    try:
        visualizer_path = get_visualizer_path()
        excel_path = os.path.join(visualizer_path, "Spec.xlsx")

        if not os.path.exists(excel_path):
            logging.warning(f"⚠️ Excel-Datei nicht gefunden: {excel_path}")
            return False

        df = pd.read_excel(excel_path)
        # Агрессивная очистка названий колонок
        df.columns = df.columns.map(lambda x: str(x).strip().replace('\xa0', '').replace(' ', ''))

        logging.info("📋 Excel-Spalten: %s", df.columns.tolist())

        required_columns = {"XML-Tag", "frontendBuilder Feld", "Bedeutung", "Block"}
        if not required_columns.issubset(df.columns):
            logging.error("❌ Die Excel-Datei enthält nicht alle erforderlichen Spalten.")
            return False

        tag_dict = {}
        for _, row in df.iterrows():
            logging.debug("🔍 Zeile: %s", row.to_dict())  # Подробная отладка по строкам
            tag = str(row["XML-Tag"]).strip().replace("<", "").replace(">", "")
            block = str(row["Block"]).strip()
            frontend = str(row["frontendBuilder Feld"]).strip()
            bedeutung = str(row["Bedeutung"]).strip()

            if tag and block:
                if block not in tag_dict:
                    tag_dict[block] = {}
                tag_dict[block][tag] = {
                    "frontend": frontend,
                    "bedeutung": bedeutung
                }

        output_path = os.path.join(visualizer_path, "specification.json")
        with open(output_path, "w", encoding="utf-8") as json_file:
            json.dump(tag_dict, json_file, ensure_ascii=False, indent=2)

        logging.info("✅ Excel wurde erfolgreich in JSON konvertiert.")
        return True

    except Exception as e:
        logging.error(f"❌ Fehler bei der Konvertierung der Excel-Datei: {e}")
        return False

if __name__ == "__main__":
    result = convert_excel_to_json()
    if result:
        print("✅ Excel wurde erfolgreich konvertiert.")
    else:
        print("⚠️ Die Konvertierung der Excel-Datei ist fehlgeschlagen.")
