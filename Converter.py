import xml.etree.ElementTree as ET
import json
import os

# Rekursive Funktion zur Umwandlung von XML in ein Wörterbuch
def xml_to_dict(element):
    result = {}

    if element.attrib:
        result['@attributes'] = element.attrib

    if element.text and element.text.strip():
        result['#text'] = element.text.strip()

    children = list(element)
    if children:
        grouped_children = {}
        for child in children:
            child_dict = xml_to_dict(child)
            if child.tag in grouped_children:
                grouped_children[child.tag].append(child_dict)
            else:
                grouped_children[child.tag] = [child_dict]
        result.update(grouped_children)

    return {element.tag: result}

# Funktion zum Extrahieren der ITEMID ohne Maskierung von $
def extract_item_id(element):
    item_id = "Unbekannt"
    itemheader = element.find("ITEMHEADER")
    if itemheader is not None:
        itemid_element = itemheader.find("ITEMID")
        if itemid_element is not None and itemid_element.text:
            item_id = itemid_element.text.strip().replace("$$", "$$")
    return item_id

# Funktion zum Anreichern des Knotens mit zusätzlichen Informationen zur Anzeige
def enrich_node_data(node, element):
    text = element.find("TEXT")
    if text is not None and text.text:
        node['text_content'] = text.text.strip()

    blockref = element.find("BLOCKREF")
    if blockref is not None:
        blockid = blockref.find("BLOCKID")
        if blockid is not None and blockid.text:
            node['blockid_content'] = blockid.text.strip()

    defaultdasi = element.find("DEFAULTDASI")
    if defaultdasi is not None and defaultdasi.text:
        node['defaultdasi_content'] = defaultdasi.text.strip()

    return node

# Funktion zum Verarbeiten der XML-Datei und Speichern als JSON
def process_xml(file_path, output_dir=None):
    # Dateiname loggen
    print(f"📥 Verarbeite XML-Datei: {file_path}")

    tree = ET.parse(file_path)
    root = tree.getroot()

    # XML in eine D3-Struktur umwandeln
    def build_d3_structure(element):
        node = {}
        node['name'] = element.tag
        node['item_id'] = extract_item_id(element)

        # Zusätzliche Inhalte (text_content, blockid_content, defaultdasi_content)
        node = enrich_node_data(node, element)

        children = list(element)
        if children:
            node['children'] = [build_d3_structure(child) for child in children]
        else:
            # Endknoten – speichere Textinhalt im Feld "value"
            if element.text and element.text.strip():
                node['value'] = element.text.strip()

        return node

    d3_data = build_d3_structure(root)

    # Projektverzeichnis bestimmen
    project_dir = os.path.dirname(os.path.abspath(__file__))

    # Zielverzeichnis 'visualizer' im Projektordner
    output_dir = os.path.join(project_dir, "visualizer")

    # Aktuelles Arbeitsverzeichnis anzeigen
    print(f"🔍 Aktuelles Arbeitsverzeichnis: {os.getcwd()}")

    # Ordner 'visualizer' anlegen, falls er nicht existiert
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # Pfad zur Ausgabedatei
    output_path = os.path.join(output_dir, "graph_data.json")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(d3_data, f, ensure_ascii=False, indent=2)

    # Ausgabe bestätigen
    print("\n✅ JSON-Datei wurde gespeichert!")
    print(f"📁 Vollständiger Pfad: {os.path.abspath(output_path)}")
