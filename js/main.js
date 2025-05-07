/* Initialisierung von Variablen */
const fileInput = document.getElementById('fileInput');
const fileSearch = document.getElementById('fileSearch');
const fileList = document.getElementById('fileList');
const treeContainer = document.getElementById('tree');
const tagValue = document.getElementById('tagValue');
let totalTime = 0;
let processedFilesCount = 0;

/* Erstellen von Karten zur Speicherung der Dateien und ihrer JSON-Daten */
let fileMap = new Map();
let jsonMap = new Map();
let currentRoot = null;
let svg, g, treeLayout, root, duration = 400;

/* Initialisierung des Tooltips */
const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

/* Event-Listener für das Dateieingabefeld */
fileInput.addEventListener('change', handleFiles);
/* Event-Listener für das Suchfeld */
fileSearch.addEventListener('input', filterFileList);

/* Funktion zum Handhaben der ausgewählten Dateien */
function handleFiles(event) {
  const files = event.target.files;
  for (const file of files) {
    const reader = new FileReader();
    reader.onload = e => {
      const parser = new DOMParser();
      const xml = parser.parseFromString(e.target.result, 'text/xml');
      fileMap.set(file.name, xml);
      const json = xmlToJson(xml.documentElement);
      jsonMap.set(file.name, json);
      updateFileList();  /* Liste der Dateien aktualisieren */
    };
    reader.readAsText(file);  /* Datei als Text lesen */
  }
}

/* Funktion zur Filterung der Dateiliste */
function filterFileList() {
  const filter = fileSearch.value.toLowerCase();
  Array.from(fileList.children).forEach(li => {
    li.style.display = li.textContent.toLowerCase().includes(filter) ? '' : 'none';
  });
}

/* Funktion zum Aktualisieren der Dateiliste */
function updateFileList() {
  fileList.innerHTML = '';
  for (const name of fileMap.keys()) {
    const li = document.createElement('li');
    li.textContent = name;
    li.addEventListener('click', () => {
      Array.from(fileList.children).forEach(el => el.classList.remove('selected'));
      li.classList.add('selected');
      showTree(jsonMap.get(name));  /* Baum für die ausgewählte Datei anzeigen */
    });
    fileList.appendChild(li);
  }
}


/* Funktion zum Anzeigen des Baums */
function showTree(data) {
  currentRoot = data;
  treeContainer.innerHTML = '';
  tagValue.style.display = 'none';  /* Tag-Wert ausblenden */

  const width = treeContainer.clientWidth || 500;
  const height = treeContainer.clientHeight || 500;

  if (!width || !height) {
    console.error("Invalid dimensions for tree container", width, height);  /* Fehler, falls ungültige Dimensionen */
    return;
  }

  /* Erstellen des SVG-Elements für den Baum */
  svg = d3.select("#tree").append("svg")
    .attr("width", width)
    .attr("height", height)
    .call(d3.zoom()
      .scaleExtent([0.1, 5])  /* Zoom-Bereich definieren */
      .on("zoom", (event) => {
        if (event.transform) {
          g.attr("transform", event.transform);  /* Baum skalieren */
        } else {
          console.error("Invalid zoom event", event);
        }
      }))
    .on("dblclick.zoom", null);

  g = svg.append("g")
    .attr("transform", "translate(40,40)");  /* Verschiebung des Baums im SVG */

  root = d3.hierarchy(data);  /* Hierarchie der Daten erstellen */
  treeLayout = d3.tree().size([height - 80, width - 160]);  /* Baum-Layout */
  root.x0 = height / 2;
  root.y0 = 0;

  root.children?.forEach(collapse);  /* Alle Kinder falten */

  update(root);  /* Baum aktualisieren */
}

/* Funktion zum Falten der Kinder eines Knotens */
function collapse(d) {
  if (d.children) {
    d._children = d.children;
    d._children.forEach(collapse);
    d.children = null;
  }
}

function loadTreeByBlockId(blockIdValue) {
  if (!blockIdValue) return;

  let targetFileName = blockIdValue.trim();

  // Если расширение отсутствует — добавим .GEN
  if (!targetFileName.toUpperCase().endsWith('.GEN')) {
    targetFileName += '.GEN';
  }
  console.log("Ищу:", targetFileName);
  console.log("Available files in fileMap:", Array.from(fileMap.keys()));

  if (fileMap.has(targetFileName)) {
    const targetJson = jsonMap.get(targetFileName);
    showTree(targetJson); // Показ дерева нового файла
  } else {
    alert(`Datei ${targetFileName} wurde noch nicht hochgeladen.`);
  }
}


function update(source) {
  const treeData = treeLayout(root); // Verarbeitung des Baums basierend auf aktuellen Daten
  const nodes = treeData.descendants(); // Bereitstellung aller Knoten
  const links = treeData.links(); // Bereitstellung aller Verbindungen zwischen Knoten

  nodes.forEach(d => d.y = d.depth * 400); // Festlegung der Y-Koordinate für jeden Knoten

  const node = g.selectAll("g.node") // Auswahl aller Graphknoten
    .data(nodes, d => d.id || (d.id = ++d.index)); // Aktualisierung  aller Knoten nach ID 

  // Anlage neuer Knoten falls nicht vorhanden
  const nodeEnter = node.enter().append("g")
    .attr("class", "node")
    .attr("transform", d => `translate(${source.y0},${source.x0})`) // Festlegen der Startkoordinaten für Knoten
    .on("mouseover", (event, d) => {
      tooltip.transition().duration(200).style("opacity", .9); // Anzeige des Tooltips
      tooltip.html(`<strong>${d.data.name}</strong><br>${Object.entries(d.data)
        .filter(([k]) => k !== 'name' && k !== 'children' && k !== 'id')
        .map(([k, v]) => `${k}: ${v}`).join("<br>")}`)
        .style("left", (event.pageX + 10) + "px") // Positionierung des Tooltips
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", () => {
      tooltip.transition().duration(500).style("opacity", 0); // Ausblenden des Tooltips nach Verlassen der Maus
    })
    .on("click", (event, d) => {
      tagValue.style.display = 'none'; // Ausblenden der aktuellen Daten
      if (!d.children && !d._children) {
        const value = d.data.value || '[leer]'; // Anzeige des Werts des Elements, falls vorhanden
        if (value === '[leer]') {
          alert("Leer: Dieses Element hat keinen Wert.");
        } else {
          tagValue.textContent = value;
          tagValue.style.display = 'block';
        }
      }

      if (d.data.name === "BLOCKID" && d.data.value) {
        loadTreeByBlockId(d.data.value);
        return;
      }
       else {
        if (d.children) {
          d._children = d.children;
          d.children = null;
        } else if (d._children) {
          d.children = d._children;
          d._children = null;
        }
        
        update(d); // Aktualisierung des Baumes
      }
      console.log("d =", d, "x =", d.x, "y =", d.y); 
    }); 

  const rectWidth = 80; // Rechteckbreite
  const rectHeight = 20; // Rechteckhöhe

  nodeEnter.append("rect") // Hinzufügen eines Rechtecks für jeden Knoten
    .attr("x", -rectWidth / 2) // Zentrierung des Rechtecks entlang der X-Achse
    .attr("y", -rectHeight / 2) // Zentrierung des Rechtecks entlang der Y-Achse
    .attr("width", rectWidth)
    .attr("height", rectHeight)
    .attr("fill", d => d.children || d._children ? "#add8e6" : "#90ee90"); // Knotenfarbe je nach Vorhandensein von Kindknoten

  nodeEnter.append("text") // Hinzufügen von Text mit dem Namen des Elements
    .attr("text-anchor", "middle")
    .attr("dy", ".35em") // Textposition je nach Vorhandensein von Kindknoten
    .attr("x", 0)
    .text(d => d.data.name); // Elementsname

  nodeEnter.filter(d => d.data.children && d.data.children.some(child => child.name === 'ITEMHEADER')) // Filtern von Knoten mit Kindknoten vom Typ ITEMHEADER
    .append('text')
    .attr('class', 'itemid')
    .attr('dy', 30)
    .attr('text-anchor', 'middle')
    .text(d => {
      const itemHeader = d.data.children.find(child => child.name === 'ITEMHEADER');
      const itemId = itemHeader ? itemHeader.children.find(child => child.name === 'ITEMID') : null;
      return itemId ? itemId.value || 'N/A' : ''; // Anzeige von ITEMID, falls vorhanden
    });

  const nodeUpdate = nodeEnter.merge(node); // Aktualisierung der bestehenden Knoten

  nodeUpdate.transition() // Übergangsanimation zu neuen Koordinaten

    .duration(duration)
    .attr("transform", d => `translate(${d.y},${d.x})`);

  nodeUpdate.select("rect") // Aktualisierung der Rechteckfarbe
    .attr("fill", d => d.children || d._children ? "#add8e6" : "#90ee90");

  const link = g.selectAll("path.link") // Verarbeitung aller Verbindungen zwischen den Knoten
    .data(links, d => d.target.id);

  link.enter().insert("path", "g") // Einfügen neuer Verbindungen
    .attr("class", "link")
    .attr("d", d3.linkHorizontal()
      .x(d => d.y)
      .y(d => d.x))
    .merge(link)
    .transition() // Übergangsanimation für Verbindungen
    .duration(duration)
    .attr("d", d3.linkHorizontal()
      .x(d => d.y)
      .y(d => d.x));

  link.exit().remove(); // Entfernen der alten Verbindungen

  node.exit().transition() // Entfernen der alten Knoten mit Animation
    .duration(duration)
    .attr("transform", d => `translate(${source.y},${source.x})`)
    .remove();
}


function handleFiles(event) {
const files = event.target.files;
let startTime = Date.now(); // Starten des Timers vor der Verarbeitung der Dateien

for (const file of files) {
  const reader = new FileReader();
  reader.onload = e => {
    const xml = (new DOMParser()).parseFromString(e.target.result, 'text/xml'); // Parsen XML
    fileMap.set(file.name, xml); // Speichern von XML in einer Map

    const fileStartTime = Date.now(); // Timer für eine bestimmte Datei
    const json = xmlToJson(xml.documentElement); // Umwandlung von XML in JSON
    jsonMap.set(file.name, json); // Speichern von JSON in einer Map

    let fileEndTime = Date.now(); // Timer nach der Verarbeitung der Datei
    let fileProcessingTime = fileEndTime - fileStartTime; // Verarbeitungszeit der Datei

    totalTime += fileProcessingTime; // Aktualisierung der Gesamtverarbeitungszeit

    processedFilesCount++; // Erhöhen des Zählers für verarbeitete Dateien

    console.log(`File ${file.name} was processed in  ${fileProcessingTime/1000} sec`);

    console.log(`Number of processed files: ${processedFilesCount} from ${files.length}`); // Выводим информацию о количестве обработанных файлов

    updateFileList(); // Aktualisierung der Dateiliste
    
    let endTime = Date.now(); // Timer nach der Verarbeitung aller Dateien
    let totalProcessingTime = endTime - startTime; // Gesamte Verarbeitungszeit

    console.log(`Total time of data processing: ${totalProcessingTime/1000} sek`); // Ausgabe der gesamten Verarbeitungszeit der Daten
  };
  reader.readAsText(file);
}
}

function xmlToJson(xml) {
const obj = { name: xml.nodeName }; // Erstellen eines Objekts mit dem Namen des Knotens
if (xml.attributes) { // Verarbeitung der Attribute
  for (let attr of xml.attributes) {
    obj[attr.name] = attr.value;
  }
}
if (xml.childNodes.length > 0) { // Wenn untergeordnete Elemente vorhanden sind
  const children = [];
  for (let node of xml.childNodes) {
    if (node.nodeType === 1) { // Wenn es sich um ein Element handelt (nicht Text)
      children.push(xmlToJson(node)); // Rekursive Verarbeitung des untergeordneten Elements
    } else if (node.nodeType === 3 && node.nodeValue.trim()) { // Wenn es sich um Text handelt
      obj.value = node.nodeValue.trim(); // Speichern des Textwerts
    }
  }
  if (children.length > 0) {
    obj.children = children; // Hinzufügen der untergeordneten Elemente
  }
}
return obj; // Rückgabe des Objekts
}