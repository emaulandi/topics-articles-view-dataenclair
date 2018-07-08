var topics = ["Confidentialité", "Biais", "Responsabilité", "Transparence"];

var colorScale = d3.scaleOrdinal(['#fbb4ae','#b3cde3','#ccebc5','#decbe4'])
    .domain(topics);

var width = 400,
    height = 800;

var yScale;

var svg = d3.select("#chart").append("svg")
		.attr("width", width)
		.attr("height", height)
	  .append('g');

/// TOOLTIP ///
// Add a div that will go wherever in the body 
var tooltip = d3.select("body").append("div")
	.attr("class", "tooltip");
tooltip.style("opacity", 0);

/*
var t = textures.paths()
  .d("crosses")
  .lighter()
  .thicker();

svg.call(t);
*/

const nodePadding = 2;

const forcePropsTimeline = {
	forceX:{
		x: width/2,
		strength: 0.4
	},
	forceY: {
		y: (d) => yScale(d.dayNumbers),
		strength: 0.6
	}
};

const forcePropsCluster = {
	forceX:{
		x: (d) => d.centerX,
		strength: 0.6
	},
	forceY: {
		y: (d) => d.centerY,
		strength: 0.6
	}
};

var forces = [
	{name: "timeline", props: forcePropsTimeline, status: 1},
	{name: "cluster", props: forcePropsCluster, status: 0},
]

var simulation = d3.forceSimulation();
var networkData ;

setupBtn();

const clusterPosition = generateClusterPosition(topics.length);

d3.json("data/articles.json", function(error, data) {

	var date;
	
	data.forEach( (d,i) => {
		date = new Date(d.date);
		d.dayNumbers = (date.getMonth() + 1)*30 + date.getDate();
		d.r = d.readTime *3;
		d.centerX = clusterPosition[topics.indexOf(d.mainTopic)].x;
		d.centerY = clusterPosition[topics.indexOf(d.mainTopic)].y;
	});
	
	networkData = data;
	
	const min = d3.min(data, d => d.dayNumbers);
	const max = d3.max(data, d => d.dayNumbers);
	//console.log(min);
	//console.log(max);
	
	yScale = d3.scaleLinear()
		.range([250,height-250])
		.domain([min,max]);
	
	initializeSimulation();
	
	svg.selectAll("circle")
		.data(networkData)
		.enter()
		.append("circle")
		.attr("class","nodes")
		.style("fill", d => colorScale(d.mainTopic))
		//.style("fill", t.url())
		.attr("r", d => d.r)
		.style("stroke","white")
		.style("stroke-width",1)
		.call(d3.drag()
			.on("start", dragstarted)
			.on("drag", dragged)
			.on("end", dragended))
		.on("mouseover", (d,i) => { 
			d3.select(d3.event.target)
				.style("stroke-width",3);
			showTip(d);
		})
		.on("mouseout", (d,i) => {
			d3.select(d3.event.target)
				.style("stroke-width",1);
			hideTip();
		});
});

function generateClusterPosition(topicsNumber){
	var clusterPosition = [];
	for(i=0;i<topicsNumber;i++){
		clusterPosition.push({x: width/2, y: (i+1)*height/(topicsNumber+1)});
	}
	return clusterPosition;
}

function setupBtn() {
	// Switch force button
	d3.select("#btn-switch-force")
		.on("click", () => {
				//check the non active force, and change its status to active
				const forceToSet = forces.find(d => d.status == 0)
				const forceToDelete = forces.find(d => d.status == 1)
				//update the force
				updateForce(forceToSet.props);
				//update the button name
				d3.select("#btn-switch-force").text("Switch to " + forceToDelete.name + " view");
				//update the previous force status to 0
				forces.find(d => d.name == forceToDelete.name).status = 0;
				//update the now current force status to 1
				forces.find(d => d.name == forceToSet.name).status = 1;

		});
	
	// Topics button
	d3.select("#btn-topics")
		.selectAll("button")
		.data(topics)
		.enter()
		.append("button")
		.attr("class","button")
		.style("background-color", topic => colorScale(topic))
		.text(topic => topic)
		.on("click", (topic) => {
			d3.selectAll(".nodes")
				.transition(2000)
				.style("fill", d => {
					if (d.mainTopic == topic){ return colorScale(d.mainTopic); } else{ return '#e6e6e6'; }
				})
				.attr("r", d => {
					if (d.mainTopic == topic){ return d.r; } else{ return 7; }
				});
		});
	
	// All topics button
	d3.select("#btn-topics")
	.append("button")
		.attr("class","button")
		.text("Tous")
		.on("click", (topic) => {
			d3.selectAll(".nodes")
				.transition(2000)
				.style("fill", d => colorScale(d.mainTopic))
				.attr("r", d => d.r);
		});
}

/* ---------------------- */
/* FORCE FUNCTION */
/* ---------------------- */
function initializeSimulation(){
	simulation.nodes(networkData);
	initializeForce();
	simulation.on("tick", updateNetwork);
}

function initializeForce(){
	simulation
		.force("x", d3.forceX())
		.force("y", d3.forceY())
		.force("collision", d3.forceCollide(d => d.r + nodePadding));
	
	 updateForce(forcePropsTimeline);
}

function updateForce(forceProps){
	
	simulation.force(
		"x", 
		d3.forceX(forceProps.forceX.x).strength(forceProps.forceX.strength)
	);
	
	simulation.force(
		"y",
		d3.forceY(forceProps.forceY.y).strength(forceProps.forceY.strength)
	);
	
	simulation.alpha(0.18).restart();
}

function updateNetwork(){
	d3.selectAll("circle")
		.attr("cx", d => d.x)
		.attr("cy", d => d.y)
}

function dragstarted(d) {
  if (!d3.event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(d) {
  d.fx = d3.event.x;
  d.fy = d3.event.y;
}

function dragended(d) {
  if (!d3.event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}

/* ---------------------- */
/* TOOLTIP */
/* ---------------------- */
function showTip(d) {

	tooltip.html(printArticle(d))
		.style("left", (d3.event.pageX + 10) + "px")
		.style("top", (d3.event.pageY - 20) + "px");
		
	tooltip.transition()
   		.duration(500)
   		.style("opacity", .9);
}

function hideTip() {
	tooltip.transition()
		.duration(500)
		.style("opacity", 0);
}

function printArticle(v) {
	return "<h3 class='hXtooltip'>" + v.title + "</h3>"
		+ "<br/>" + "<b>#" + v.date + "</b>";
}


