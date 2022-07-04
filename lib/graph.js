let data = require("./data.json");
let graph = {};
let vertices = {};
let minLon, maxLon;
const canvasDim = { x: 2806 / 2, y: 1740 / 2 };
let canvas;
export default async function createGraph() {
  canvas = document.getElementById("map");
  let ctx = await formatCanvas(canvas);
  vertices = {};
  graph = {};
  let sMap = generateSortMap(data);
  minLon = sMap[16]; //SF
  maxLon = sMap[0]; //NY
  graph[minLon] = {};
  vertices[minLon] = {};
  graph[maxLon] = {};
  vertices[maxLon] = {};
  const pathOrder = generateSeedPath(21, 16, 0);
  drawNodes(ctx);
  generateAdditionalEdges(ctx, pathOrder);
  await drawPaths(ctx);
  let topoGraph = flattenGraph();
  let string = createPathString(topoGraph);
  console.log(graph);
  let copyButton = document.getElementById("copy");
  copyButton.onclick = () => {
    navigator.clipboard.writeText(string);
    alert("Initialization list is in your clipboard");
  };
}
function createPathString(topoGraph) {
  let string = "{\n";
  topoGraph.forEach((leg) => {
    string += `Leg("${leg[0]}", "${leg[1]}", ${leg[2]}),\n`;
  });
  string += "};";
  return string;
}
function flattenGraph() {
  let flattenedGraph = [];
  Object.entries(graph).forEach(([start_city, edges]) => {
    Object.keys(edges).forEach((end_city) => {
      let distance = getDistanceFromLatLonInKm(
        parseCoords(data[start_city].Location),
        parseCoords(data[end_city].Location)
      ).toFixed(2);

      flattenedGraph.push([
        formatCityName(data[start_city].City),
        formatCityName(data[end_city].City),
        distance,
      ]);
    });
  });

  return flattenedGraph;
}
function generateAdditionalEdges(ctx, pathOrder) {
  let paths = toObject(pathOrder);
  for (let i = 0; i < pathOrder.length - 2; i++) {
    graph[pathOrder[i]][pathOrder[i + 2]] = {};
  }
}
function getDistanceFromLatLonInKm(loc1, loc2) {
  let lat1 = loc1[0];
  let lon1 = loc1[1];
  let lat2 = loc2[0];
  let lon2 = loc2[1];
  var R = 3958.8; // Radius of the earth in km
  var dLat = deg2rad(lat2 - lat1); // deg2rad below
  var dLon = deg2rad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c; // Distance in km
  return d;
}
function deg2rad(deg) {
  return deg * (Math.PI / 180);
}
function toObject(arr) {
  let rv = {};
  for (let i = 0; i < arr.length; ++i) rv[i] = arr[i];
  return rv;
}
async function drawPaths(ctx) {
  let pathLabel = document.getElementById("path");
  for (let [citykey1, edges] of Object.entries(graph)) {
    let drawMult = document.getElementById("drawSpeed").value / 100;
    for (const citykey2 of Object.keys(edges)) {
      let [a_x, a_y] = transformCoords(parseCoords(data[citykey1].Location));
      let [b_x, b_y] = transformCoords(parseCoords(data[citykey2].Location));

      ctx.beginPath();
      ctx.strokeStyle = "#00FF00";
      ctx.moveTo(a_x, a_y);
      ctx.lineTo(b_x, b_y);
      ctx.stroke();
      pathLabel.innerText =
        formatCityName(data[citykey1].City) +
        "->" +
        formatCityName(data[citykey2].City);
      await new Promise((res, rej) =>
        setTimeout(() => {
          res();
        }, 3000 * drawMult)
      );
    }
  }
}
function drawNodes(ctx) {
  Object.keys(vertices).forEach((key) => {
    let city = data[key];
    let [x, y] = transformCoords(parseCoords(city.Location));
    ctx.fillStyle = key == minLon || key == maxLon ? "#F5B342" : "#FF0000";
    ctx.font = "12px serif";
    ctx.fillText(formatCityName(city.City), x, y);
    ctx.fillRect(x, y, 2, 2);
  });
}
function transformCoords([y, x]) {
  let x_offset = (180.7 - x) / 151;
  let y_offset = 1 - (y - 20) / 60;

  return [x_offset * canvasDim.x, y_offset * canvasDim.y];
}
async function formatCanvas(canvas) {
  let { x, y } = canvasDim;
  canvas.height = y;
  canvas.width = x;
  const ctx = canvas.getContext("2d");
  const image = new Image(x, y);
  image.src = "map.png";
  await new Promise(
    (res, err) =>
      (image.onload = () => {
        res(drawCanvasPic(ctx, image));
      })
  );
  return ctx;
}
function drawCanvasPic(ctx, image) {
  ctx.drawImage(image, 0, 0, canvasDim.x, canvasDim.y);
}
function generateSeedPath(length, start, end) {
  let i = 0;
  let firstCity = minLon;
  let pathOrder = [minLon];
  while (i < length) {
    let secondCity;
    let range = maxLon - minLon;
    if (!graph[firstCity]) {
      graph[firstCity] = {};
    }
    let regionInterval = Math.round(range / length);
    if (i !== length - 1)
      while (secondCity === undefined || graph[firstCity][secondCity])
        secondCity =
          minLon +
          regionInterval * (i + 1) +
          Math.round(Math.random() * regionInterval);
    else secondCity = maxLon;
    graph[firstCity][secondCity] = {};
    vertices[firstCity] = {};
    vertices[secondCity] = {};
    pathOrder.push(secondCity);
    firstCity = secondCity;

    i++;
  }
  return pathOrder;
}
function generateSortMap(data) {
  let sortMap = data.map((city, i) => {
    return {};
  });
  data.sort((a, b) => longitudeSort(a, b));
  data.forEach((city, i) => {
    let city_index = city["2021rank"] - 1;
    sortMap[city_index] = i;
  });
  return sortMap;
}

function longitudeSort(city_a, city_b) {
  let [coords_a_x, coords_a_y] = parseCoords(city_a.Location);
  let [coords_b_x, coords_b_y] = parseCoords(city_b.Location);
  return coords_b_y - coords_a_y;
}

function parseCoords(loc) {
  let coords = loc.split("/")[1].substring(1).split(" ");
  let formatted_coords = [];
  for (let coord of coords) {
    formatted_coords.push(coord.split("°")[0]);
  }
  return formatted_coords;
}

function formatCityName(name) {
  return name.split("[") ? name.split("[")[0] : name;
}
