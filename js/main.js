// Code für Testzwecke
let d = new Date();
let p = document.querySelector('p');
p.textContent = "Todays date is" + d;



//Zugriff auf D3 testen
if (typeof d3 !== 'undefined') {
    console.log("✅ D3.js wurde erfolgreich geladen.");

    // Einfacher Kreis in SVG zeichnen
    const svg = d3.select("#chart")
      .append("svg")
      .attr("width", 200)
      .attr("height", 200);

    svg.append("circle")
      .attr("cx", 100)
      .attr("cy", 100)
      .attr("r", 50)
      .attr("fill", "red");
  } else {
    console.error("❌ D3.js konnte nicht geladen werden.");
  }
  console.log(name, age);