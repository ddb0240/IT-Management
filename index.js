let markers = [];
let stopList = [];
let goodDestRoutes = [];
let goodOrigRoutes = [];
let goodRecRoutes = [];
let currentLocation;
let id;
let polyline;

// Use Fetch API to load JSON file as objects for routes
async function populate(map, directionsService, directionsRenderer) {
	const requestURL = "./routes.json";
	const request = new Request(requestURL);
	const response = await fetch(request);
	const routes = await response.json();

	// Dynamically create route cards from JSON
	createRoutes(map, routes, directionsService, directionsRenderer);
}

//Access DOM and create route cards from JSON file
function createRoutes(map, routes, directionsService, directionsRenderer) {
	const container = document.getElementById('route-list');
	const d = new Date();
	const day = d.getDay();
	const time = d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

	for (const route of routes) {
		const content = document.createElement('div');
		const textContainer = document.createElement('div');
		const timeContainer = document.createElement('div');
		const newRoute = document.createElement('button');
		const newHeader = document.createElement('h2');
		const newID = document.createElement('p');
		const nextStopText = document.createElement('div');
		const stopText = document.createElement('p');
		const indexContainer = document.createElement('div');
		const indexText = document.createElement('p');
		const timeText = document.createElement('h2');
		const minutes = document.createElement('p');

		newHeader.textContent = route.name;
		newID.textContent = route.routeID;

		textContainer.classList.add("text-container");
		timeContainer.classList.add("time-container");
		content.classList.add("content");
		nextStopText.classList.add("next-stop");
		newRoute.classList.add("route-card");
		newRoute.classList.add("condensed");
		newID.classList.add("route-id");
		newHeader.classList.add("route-name")
		stopText.classList.add("next-stop-name");
		stopText.classList.add("nowrap-text");
		minutes.classList.add("time-label");
		timeText.classList.add("time-left");
		indexText.classList.add("timepoint-num");
		indexContainer.classList.add("index-label");

		newRoute.setAttribute("route-id", route.routeID.toLowerCase());
		newRoute.setAttribute("route-name", route.name.toLowerCase());

		// use current day and compare against route activity (getDay returns int)
		let n = 0;
		while (route.timepoints[n].times[0] == "") {
			n++
		}
		const startTime = route.timepoints[n].times[0]
		const endTime = route.timepoints[route.timepoints.length - 1].times.slice(-1).toString();
		let nextStop;
		let nextStopIndex;
		let nextTimeIndex;
		if (!route.active.enabled) { // Route is not enabled
			newRoute.classList.add("inactive");
			newID.style.backgroundColor = "#CC0000";
			stopText.textContent = "Inactive for Summer 2023";
			indexText.textContent = "!";
		} else if (!route.active.days.includes(day)) { // Route is inactive for today
			newRoute.classList.add("inactive");
			stopText.textContent = route.timepoints[0].name;
			newID.style.backgroundColor = "#FFAA00";
			indexText.textContent = n + 1;
			if (route.active.days.includes(day + 1)) {
				minutes.textContent = "tomorrow";
			} else {
				minutes.textContent = "Monday";
			}
		} else if (time <= startTime || time >= endTime) { // Route is inactive at this time
			newRoute.classList.add("inactive");
			stopText.textContent = route.timepoints[n].name;
			timeText.textContent = startTime;
			indexText.textContent = n + 1;
			newID.style.backgroundColor = "#FFAA00";
			if (startTime < time) {
				if (route.active.days.includes(day + 1)) {
					minutes.textContent = "tomorrow";
				} else {
					minutes.textContent = "Monday";
				}
			} else {
				minutes.textContent = "later today";
			}
		} else { // Route is active
			newID.style.backgroundColor = "#509E2F";
			minutes.textContent = "minutes";

			let nextTime = endTime;
			for (let i = 0; i < route.timepoints.length; i++) {
				for (let j = 0; j < route.timepoints[i].times.length; j++) {
					if (route.timepoints[i].times[j] >= time) {
						if (route.timepoints[i].times[j] <= nextTime) {
							nextTime = route.timepoints[i].times[j];
							nextTimeIndex = j
							nextStop = route.timepoints[i].name;
							nextStopIndex = i + 1;
						}
					}
				}
			}
			stopText.textContent = nextStop;
			stopText.classList.add("timepoint-text");
			timeText.textContent = (Number((nextTime.slice(0, 2) * 60)) + Number(nextTime.slice(3, 5))) - (Number((time.slice(0, 2) * 60)) + Number(time.slice(3, 5)));
			indexText.textContent = nextStopIndex;
			newRoute.setAttribute("next-time", nextTime);
		}

		// Add event handler to route-cards to display routes
		const eventHandler = function() {
			calculateAndDisplayRoute(directionsService, directionsRenderer, route, map);
			addMarkers(map, route.timepoints, route.stops);
			expandCard(route.routeID.toLowerCase());
			window.clearInterval(id);
			polyline.setMap(null);
		}
		newRoute.addEventListener("click", eventHandler);

		timeContainer.appendChild(timeText);
		timeContainer.appendChild(minutes);
		newRoute.appendChild(newHeader);
		textContainer.appendChild(newID);
		indexContainer.appendChild(indexText);
		nextStopText.appendChild(indexContainer);
		nextStopText.appendChild(stopText);
		textContainer.appendChild(nextStopText);
		content.appendChild(textContainer);
		content.appendChild(timeContainer);
		newRoute.appendChild(content);

		if (route.active.enabled) { // Create route timepoint list on focus
			stopList.push(route);
			const timepointList = document.createElement('div');
			timepointList.classList.add("timepoint-list");
			for (let i = nextStopIndex; i < route.timepoints.length; i++) {
				const timepointContainer = document.createElement('div');
				timepointContainer.classList.add("timepoint-container");

				const labelContainer = document.createElement('div');
				labelContainer.classList.add("index-label");

				const routeTimepoint = document.createElement('p');
				routeTimepoint.textContent = route.timepoints[i].name;
				routeTimepoint.classList.add("nowrap-text");

				const number = document.createElement('p');
				number.classList.add('timepoint-num');
				number.textContent = i + 1;

				const nextTimepointTime = route.timepoints[i].times[nextTimeIndex];
				const routeTimepointTime = document.createElement('p')
				routeTimepointTime.textContent = nextTimepointTime;
				routeTimepointTime.classList.add("timepoint-time");

				labelContainer.appendChild(number);
				timepointContainer.appendChild(labelContainer);
				timepointContainer.appendChild(routeTimepoint);
				timepointContainer.appendChild(routeTimepointTime);

				timepointList.appendChild(timepointContainer)
			}
			for (let i = 0; i < nextStopIndex; i++) { //Repeat from start to show next cycle up to current position
				const nextTimepointTime = route.timepoints[i].times[nextTimeIndex + 1];
				if (nextTimepointTime) {
					const routeTimepointTime = document.createElement('p')
					routeTimepointTime.textContent = nextTimepointTime;
					routeTimepointTime.classList.add("timepoint-time");

					const timepointContainer = document.createElement('div');
					timepointContainer.classList.add("timepoint-container");

					const labelContainer = document.createElement('div');
					labelContainer.classList.add("index-label");

					const routeTimepoint = document.createElement('p');
					routeTimepoint.textContent = route.timepoints[i].name;
					routeTimepoint.classList.add("nowrap-text");

					const number = document.createElement('p');
					number.classList.add('timepoint-num');
					number.textContent = i + 1;

					labelContainer.appendChild(number);
					timepointContainer.appendChild(labelContainer);
					timepointContainer.appendChild(routeTimepoint);
					timepointContainer.appendChild(routeTimepointTime);

					timepointList.appendChild(timepointContainer)
				}
			}
			newRoute.appendChild(timepointList);
		}

		container.appendChild(newRoute);
	}
}

// Initialize map and load Google Maps services
function initMap() {
	const mapCenter = { lat: 33.21128520875526, lng: -97.14619021951677 };
	const directionsService = new google.maps.DirectionsService({
		avoidHighways: true
	});
	const directionsRenderer = new google.maps.DirectionsRenderer({
		suppressMarkers: true,
		polylineOptions: {
			strokeColor: "#008000",
			strokeOpacity: .6,
			strokeWeight: 6
		}
	});
	const destInput = document.getElementById("destination");
	const origInput = document.getElementById("origin");
	const defaultBounds = {
		north: mapCenter.lat + 0.1,
		south: mapCenter.lat + 0.1,
		east: mapCenter.lng + 0.1,
		west: mapCenter.lng + 0.1,
	};
	const searchOptions = {
		bounds: defaultBounds,
		componentRestrictions: { country: ["us"] },
	};
	const destSearch = new google.maps.places.SearchBox(destInput, searchOptions);
	const originBox = document.getElementById("origin");
	const origSearch = new google.maps.places.SearchBox(origInput, searchOptions);
	const searchButton = document.getElementById("search-button");
	searchButton.addEventListener("click", () => {
		let destination;
		let origin;
		if (origInput.value == '') {
			getCurrentLocation();
			origin = currentLocation;
		} else {
			const origins = origSearch.getPlaces();
			if (!origins) {
				alert("Error with search, select from autocomplete");
				return;
			}
			origins.forEach((place) => {
				origin = { "lat": place.geometry.location.lat(), "lng": place.geometry.location.lng() }
			});
		}
		const destinations = destSearch.getPlaces();
		if (!destinations) {
			alert("Error with search, select from autocomplete");
			return;
		}
		destinations.forEach((place) => {
			destination = { "lat": place.geometry.location.lat(), "lng": place.geometry.location.lng() }
		});
		findClosest(origin, destination);
	});

	const myStyles = [{
		featureType: "poi",
		elementType: "labels",
		stylers: [{ visibility: "off" }]
	}];

	const panoramaOptions = {
		addressControlOptions: {
			position: google.maps.ControlPosition.BOTTOM_CENTER,
		},
		visible: false,
		enableCloseButton: true
	}

	const mapOptions = {
		zoom: 15,
		center: mapCenter,
		styles: myStyles,
		mapTypeControl: true,
		mapTypeControlOptions: {
			style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
			position: google.maps.ControlPosition.TOP_CENTER
		},
	};

	const map = new google.maps.Map(document.getElementById("map"), mapOptions);
	directionsRenderer.setMap(map);
	const panorama = map.getStreetView();
	panorama.setOptions({
		addressControlOptions: {
			position: google.maps.ControlPosition.BOTTOM_CENTER
		}
	});

	polyline = new google.maps.Polyline({
		path: null,
		icons: [{
			icon: null,
			offset: "100%",
		},],
		strokeOpacity: 0,
		map: null,
	});

	// Read JSON file
	populate(map, directionsService, directionsRenderer);
}

// Calculate and load roats based on route waypoints
function calculateAndDisplayRoute(directionsService, directionsRenderer, route, map) {
	const origin = route.origin;
	const waypoints = route.waypoints;
	const passRoute = route;
	// Format waypoints from JSON array
	const waypts = [];
	for (let i = 0; i < waypoints.length; i++) {
		waypts.push({
			location: waypoints[i],
			stopover: true,
		});
	}

	const routeSelector = '[route-id="' + route.routeID.toLowerCase() + '"]';
	const routeCard = document.querySelector(routeSelector);
	const nextTime = routeCard.getAttribute("next-time");

	directionsService
		.route({
			origin: origin,
			destination: origin,
			waypoints: waypts,
			travelMode: google.maps.TravelMode.DRIVING,
		})
		.then((response) => {
			directionsRenderer.setDirections(response);

			const route = response.routes[0];
			const d = new Date();
			const day = d.getDay();
			const time = d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
			const seconds = (Number((time.slice(0, 2) * 60)) + Number(time.slice(3, 5))) * 60 + d.getSeconds();
			let startRoute;
			let endRoute;
			let currentStop;
			let nextStop = passRoute.timepoints[passRoute.timepoints.length - 1].times.slice(-1).toString();
			let currentStopIndex;
			let currentTimeIndex;
			let nextStopIndex;
			let nextTimeIndex;
			
			for (let i = 0; i < passRoute.timepoints.length; i++) {
				if (passRoute.timepoints[i].times[0]) {
					startRoute = passRoute.timepoints[i].times[0];
					break;
				}
			}
			startRoute = (Number((startRoute.slice(0, 2) * 60)) + Number(startRoute.slice(3, 5))) * 60;
			
			for (let i = 0; i < passRoute.timepoints.length; i++) {
				if (passRoute.timepoints[i].times[passRoute.timepoints[0].times.length - 1]) {
					endRoute = passRoute.timepoints[i].times[passRoute.timepoints[0].times.length - 1];
				}
			}
			endRoute = (Number((endRoute.slice(0, 2) * 60)) + Number(endRoute.slice(3, 5))) * 60;
			
			if (passRoute.active.enabled != false && seconds >= startRoute && seconds < endRoute && passRoute.active.days.includes(day)) {
				for (let i = 0; i < passRoute.timepoints.length; i++) {
					for (let j = 0; j < passRoute.timepoints[i].times.length; j++) {
						if (passRoute.timepoints[i].times[j] >= time) {
							if (passRoute.timepoints[i].times[j] <= nextStop) {
								nextStop = passRoute.timepoints[i].times[j];
								nextStopIndex = i;
								nextTimeIndex = j;
							}
						}
					}
				}
				
				if (nextStopIndex - 1 < 0) {
					currentStopIndex = passRoute.timepoints.length - 1;
					currentTimeIndex = nextTimeIndex - 1;
					currentStop = passRoute.timepoints[currentStopIndex].times[currentTimeIndex];
				}
				else {
					currentStopIndex = nextStopIndex - 1;
					currentTimeIndex = nextTimeIndex;
					currentStop = passRoute.timepoints[currentStopIndex].times[currentTimeIndex];
				}
				currentStop = (Number((currentStop.slice(0, 2) * 60)) + Number(currentStop.slice(3, 5))) * 60;
				nextStop = (Number((nextStop.slice(0, 2) * 60)) + Number(nextStop.slice(3, 5))) * 60;
				
				const lineSymbol = {
					path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
					scale: 8,
					strokeColor: "#393",
					strokeOpacity: 1,
				};
				const myRoute = response.routes[0];
				var newPath = [];
				for (let i = 0; i < myRoute.legs.length; i++) {
					for (let j = 0; j < myRoute.legs[i].steps.length; j++) {
						for (let k = 0; k < myRoute.legs[i].steps[j].path.length; k++)
							newPath.push(myRoute.legs[i].steps[j].path[k]);
					}
				}
				polyline = new google.maps.Polyline({
					path: newPath,
					icons: [{
						icon: lineSymbol,
						offset: "100%",
					},],
					strokeOpacity: 0,
					map: map,
				});

				if (seconds - currentStop < passRoute.animationScale * 60 / passRoute.animationPoints.length) {
					let count;
					if (passRoute.animationPoints[currentStopIndex] < passRoute.animationPoints[nextStopIndex]) {
						count = Math.floor(((passRoute.animationPoints[nextStopIndex] - passRoute.animationPoints[currentStopIndex]) *
										(seconds - currentStop) /
										(passRoute.animationScale * 60 / passRoute.animationPoints.length)) + 
										passRoute.animationPoints[currentStopIndex]);
					}
					else {
						count = Math.floor(((3000 - passRoute.animationPoints[currentStopIndex]) *
										(seconds - currentStop) /
										(passRoute.animationScale * 60 / passRoute.animationPoints.length)) + 
										passRoute.animationPoints[currentStopIndex]);
					}
					id = animatePolyLine(polyline, count * passRoute.animationScale, passRoute, nextStopIndex, passRoute.animationTimes[nextStopIndex]);
				}
				else {
					id = animatePolyLine(polyline, passRoute.animationPoints[nextStopIndex] * passRoute.animationScale, passRoute, nextStopIndex, (nextStop - seconds) * 1000);
				}
			}
		})
		.catch((e) => window.alert("Directions request failed"));
}

function setMapOnAll(map) {
	for (let i = 0; i < markers.length; i++) {
		markers[i].setMap(map);
	}
}

// Add markers to stops for timepoints and stops
function addMarkers(map, timepoints, stops) {
	setMapOnAll(null);
	markers = [];
	let counter = 1;
	const image = {
		url: "./assets/marker.png",
		scaledSize: new google.maps.Size(24, 32),
		labelOrigin: new google.maps.Point(12, 12),
	}
	const imageSmall = {
		url: "./assets/marker.png",
		scaledSize: new google.maps.Size(19.2, 25.6),
		labelOrigin: new google.maps.Point(10, 10),
	}
	for (const timepoint of timepoints) {
		const infoWindow = new google.maps.InfoWindow({
			content: timepoint.name,
		});
		const marker = new google.maps.Marker({
			position: timepoint.coordinates,
			map,
			label: {
				text: counter.toString(),
				fontFamily: "",
				color: "#ffffff",
				fontSize: "18px",
			},
			icon: image,
			title: timepoint.name,
			markerName: timepoint.name
		});
		marker.addListener("click", () => {
			infoWindow.open({
				anchor: marker,
				map,
			});
		});
		markers.push(marker);
		counter++;
	}
	for (const stop of stops) {
		const infoWindow = new google.maps.InfoWindow({
			content: stop.name,
		});
		const marker = new google.maps.Marker({
			position: stop.coordinates,
			map,
			label: {
				text: "\ue530",
				fontFamily: "Material Icons",
				color: "#ffffff",
				fontSize: "15px",
			},
			icon: imageSmall,
			title: stop.name,
			markerName: stop.name,
		});
		marker.addListener("click", () => {
			infoWindow.open({
				anchor: marker,
				map,
			});
		});
		markers.push(marker);
	}
	setMapOnAll(map)
}

function expandCard(routeID) {
	const cards = document.querySelectorAll(".route-card");
	for (let i = 0; i < cards.length; i++) {
		if (cards[i].classList.contains("selected")) {
			cards[i].classList.remove("selected");
		}
	}
	const search = '[route-id="' + routeID + '"]';
	document.querySelector(search).classList.add("selected");
}

function expandRec(recID) {
	const recs = document.querySelectorAll(".rec-button");
	console.log(recs);
	for (let i = 0; i < recs.length; i++) {
		if (recs[i].classList.contains("selected")) {
			recs[i].classList.remove("selected");
		}
	}
	const search = '[rec-id="' + recID.toLowerCase() + '"]';
	console.log(search);
	document.querySelector(search).classList.add("selected");
}

function findClosest(origin, destination) {
	let distance;
	goodDestRoutes = [];
	goodOrigRoutes = [];
	goodRecRoutes = [];
	const recList = document.getElementById("rec-list");
	recList.style.display = "flex";
	while (recList.firstChild) {
		recList.removeChild(recList.firstChild);
	}
	for (const route of stopList) {
		let minDestDistance = 0.5;
		let minOrigDistance = 0.5;
		let minDestStop;
		let minOrigStop;
		let unionName;
		let routeActive = false;
		const routeSelector = '[route-id="' + route.routeID.toLowerCase() + '"]';
		const routeCard = document.querySelector(routeSelector);
		if (!routeCard.classList.contains("inactive")) {
			routeActive = true;
		}
		for (const timepoint of route.timepoints) {
			const name = timepoint.name;
			if (name.includes("Union Transfer")) {
				unionName = name;
			}
			distance = calculateDistance(timepoint.coordinates, destination)
			if (distance < minDestDistance) {
				minDestDistance = distance
				minDestStop = timepoint.name;
			}
			distance = calculateDistance(timepoint.coordinates, origin)
			if (distance < minOrigDistance) {
				minOrigDistance = distance
				minOrigStop = timepoint.name;
			}
		}
		for (const stop of route.stops) {
			distance = calculateDistance(stop.coordinates, destination)
			if (distance < minDestDistance) {
				minDestDistance = distance
				minDestStop = stop.name;
			}
			distance = calculateDistance(stop.coordinates, origin)
			if (distance < minOrigDistance) {
				minOrigDistance = distance
				minOrigStop = stop.name;
			}
		}
		if (minDestDistance < 0.5 && minOrigDistance < 0.5) { //Route is a valid recomendation
			const validRoute = {
				"name": route.name,
				"id": route.routeID,
				"origStop": minOrigStop,
				"origDistance": minOrigDistance,
				"destStop": minDestStop,
				"destDistance": minDestDistance,
				"active": routeActive
			}
			goodRecRoutes.push(validRoute);
		} else if (minOrigDistance < 0.5) {
			const origRoute = {
				"name": route.name,
				"id": route.routeID,
				"stop": minOrigStop,
				"union": unionName,
				"distance": minOrigDistance,
				"active": routeActive
			}
			goodOrigRoutes.push(origRoute);
		} else if (minDestDistance < 0.5) {
			const destRoute = {
				"name": route.name,
				"id": route.routeID,
				"stop": minDestStop,
				"union": unionName,
				"distance": minDestDistance,
				"active": routeActive
			}
			goodDestRoutes.push(destRoute);
		}
	}
	if (goodRecRoutes.length != 0) { //There is a non-transfer route
		populateRecs(goodRecRoutes, false);
		return;
	} else if (goodDestRoutes.length == 0) { // There are no routes near destination
		const searchError = document.createElement('p');
		searchError.textContent = "There are no routes near your destination."
		recList.appendChild(searchError);
		return;
	} else if (goodOrigRoutes.length == 0) { // There are no routes near origin
		const searchError = document.createElement('p');
		searchError.textContent = "There are no routes near your origin."
		recList.appendChild(searchError);
		return;
	} else { // There is a transfer route
		console.log("transfer route");
		for (const origRoute of goodOrigRoutes) {
			for (const destRoute of goodDestRoutes) {
				const transferRoute = {
					"origName": origRoute.name,
					"destName": destRoute.name,
					"origID": origRoute.id,
					"destID": destRoute.id,
					"origStop": origRoute.stop,
					"origUnion": origRoute.union,
					"destStop": destRoute.stop,
					"destUnion": destRoute.union,
					"origDistance": origRoute.distance,
					"destDistance": destRoute.distance,
					"origActive": origRoute.active,
					"destActive": destRoute.active
				}
				goodRecRoutes.push(transferRoute);
			}
		}
		populateRecs(goodRecRoutes, true);
	}
}

// Calculate distance between two LatLng coordinate objects
function calculateDistance(loc1, loc2) {
	const lat1 = loc1.lat;
	const lat2 = loc2.lat;
	const lon1 = loc1.lng;
	const lon2 = loc2.lng;

	const r = 6371;
	const p = Math.PI / 180;
	const a = 0.5 - Math.cos((lat2 - lat1) * p) / 2 + Math.cos(lat1 * p) * Math.cos(lat2 * p) * (1 - Math.cos((lon2 - lon1) * p)) / 2;

	return 2 * r * Math.asin(Math.sqrt(a));
}

function populateRecs(goodRoutes, transfer) {
	const recList = document.getElementById("rec-list");
	recList.style.display = "flex";
	let sortedRoutes = goodRoutes.sort(
		(p1, p2) => ((p1.origDistance + p1.destDistance) > (p2.origDistance + p2.destDistance)) ? 1 : ((p1.origDistance + p1.destDistance) < (p2.origDistance + p2.destDistance)) ? -1 : 0
	);
	for (const route of sortedRoutes) {
		const recCard = document.createElement('div');
		const recButton = document.createElement('button');
		recCard.classList.add("route-rec-card");
		const origWalk = document.createElement('div');
		const origWalkText = document.createElement('p')
		const destWalk = document.createElement('div');
		const destWalkText = document.createElement('p')
		const walkingIcon1 = document.createElement('span');
		const walkingIcon2 = document.createElement('span');
		const via = document.createElement('p');
		const originText = document.createElement('p');
		const busIcon1 = document.createElement('span');
		const busIcon2 = document.createElement('span');
		const destinationText = document.createElement('p');
		const origin = document.createElement('div');
		const destination = document.createElement('div');
		const recContent = document.createElement('div');
		recContent.classList.add("rec-content");
		recButton.classList.add("rec-button");

		walkingIcon1.classList.add("material-symbols-outlined")
		walkingIcon1.textContent = "directions_walk"
		walkingIcon2.classList.add("material-symbols-outlined")
		walkingIcon2.textContent = "directions_walk"
		origWalk.classList.add("rec-icon");
		origWalkText.textContent = Math.ceil(route.origDistance * 15) + " minute walk";
		origWalk.appendChild(walkingIcon1);
		origWalk.appendChild(origWalkText);
		destWalk.classList.add("rec-icon");
		destWalkText.textContent = Math.ceil(route.destDistance * 15) + " minute walk";
		destWalk.appendChild(walkingIcon2);
		destWalk.appendChild(destWalkText);

		const divider = document.createElement('span');
		divider.classList.add('material-symbols-outlined')
		divider.textContent = "more_vert"

		via.textContent = "via";
		origin.classList.add("rec-icon")
		destination.classList.add("rec-icon")
		originText.textContent = route.origStop;
		destinationText.textContent = route.destStop;
		busIcon1.classList.add("material-symbols-outlined")
		busIcon1.textContent = "directions_bus"
		busIcon2.classList.add("material-symbols-outlined")
		busIcon2.textContent = "directions_bus"
		origin.appendChild(busIcon1);
		origin.appendChild(originText);
		destination.appendChild(busIcon2);
		destination.appendChild(destinationText);

		const recHeader = document.createElement('div');
		const name = document.createElement('h3');
		const id = document.createElement('p');
		recHeader.classList.add("rec-header");
		id.classList.add("rec-id");

		if (transfer) {
			recButton.setAttribute("rec-id", route.origID.toLowerCase());
			recButton.addEventListener("click", () => {
				expandRec(route.origID);
				const routeSelector = '[route-id="' + route.origID.toLowerCase() + '"]';
				const routeCard = document.querySelector(routeSelector);
				routeCard.click();
				for (const marker of markers) {
					if (marker.markerName == route.origStop) {
						const image = {
							url: "./assets/marker_blue.png",
							scaledSize: new google.maps.Size(24, 32),
							labelOrigin: new google.maps.Point(12, 12),
						}
						marker.icon = image;
					}
					if (marker.markerName == route.origUnion) {
						const image = {
							url: "./assets/marker_red.png",
							scaledSize: new google.maps.Size(24, 32),
							labelOrigin: new google.maps.Point(12, 12),
						}
						marker.icon = image;
					}
				}
				busIcon1.classList.add("blue");
				busIcon3.classList.add("red");
			})
			const recButton2 = document.createElement('button');
			recButton2.classList.add("rec-button");
			recButton2.setAttribute("rec-id", route.destID.toLowerCase());
			recButton2.addEventListener("click", () => {
				expandRec(route.destID);
				const routeSelector = '[route-id="' + route.destID.toLowerCase() + '"]';
				const routeCard = document.querySelector(routeSelector);
				routeCard.click();
				for (const marker of markers) {
					if (marker.markerName == route.destUnion) {
						const image = {
							url: "./assets/marker_blue.png",
							scaledSize: new google.maps.Size(24, 32),
							labelOrigin: new google.maps.Point(12, 12),
						}
						marker.icon = image;
					}
					if (marker.markerName == route.destStop) {
						const image = {
							url: "./assets/marker_red.png",
							scaledSize: new google.maps.Size(24, 32),
							labelOrigin: new google.maps.Point(12, 12),
						}
						marker.icon = image;
					}
				}
				busIcon4.classList.add("blue");
				busIcon2.classList.add("red");
			})
			const recContent2 = document.createElement('div');
			recContent2.classList.add("rec-content");
			const recHeader2 = document.createElement('div');
			const name2 = document.createElement('h3');
			const id2 = document.createElement('p');
			const via2 = document.createElement('p')
			const busIcon3 = document.createElement('span');
			const busIcon4 = document.createElement('span');
			const union1 = document.createElement('div');
			const union2 = document.createElement('div');
			const unionText1 = document.createElement('p');
			const unionText2 = document.createElement('p');
			busIcon3.classList.add("material-symbols-outlined");
			busIcon3.textContent = "directions_bus";
			busIcon4.classList.add("material-symbols-outlined");
			busIcon4.textContent = "directions_bus";
			unionText1.textContent = route.origUnion;
			unionText2.textContent = route.destUnion;
			union1.classList.add("rec-icon");
			union2.classList.add("rec-icon");
			union1.appendChild(busIcon3);
			union1.appendChild(unionText1);
			union2.appendChild(busIcon4);
			union2.appendChild(unionText2);
			recHeader2.classList.add("rec-header");
			id2.classList.add("rec-id");
			if (route.origActive) {
				id.style.backgroundColor = "#509E2F";
			} else {
				id.style.backgroundColor = "#FFAA00";
			}
			if (route.destActive) {
				id2.style.backgroundColor = "#509E2F";
			} else {
				id2.style.backgroundColor = "#FFAA00";
			}
			name.textContent = route.origName;
			id.textContent = route.origID;
			name2.textContent = route.destName;
			id2.textContent = route.destID;
			via2.textContent = "via";
			recHeader.appendChild(via);
			recHeader.appendChild(name);
			recButton.appendChild(recHeader);
			recContent.appendChild(origWalk);
			recContent.appendChild(origin);
			recContent.appendChild(union1);
			recContent.appendChild(id);
			recButton.appendChild(recContent);
			recCard.appendChild(recButton);

			recHeader2.appendChild(via2);
			recHeader2.appendChild(name2);
			recButton2.appendChild(recHeader2);
			recContent2.appendChild(union2);
			recContent2.appendChild(destination);
			recContent2.appendChild(destWalk);
			recContent2.appendChild(id2);
			recButton2.appendChild(recContent2);
			recCard.appendChild(recButton2);
		} else { // not a transfer route
			recButton.setAttribute("rec-id", route.id.toLowerCase());
			recButton.addEventListener("click", () => {
				expandRec(route.id);
				const routeSelector = '[route-id="' + route.id.toLowerCase() + '"]';
				const routeCard = document.querySelector(routeSelector);
				routeCard.click();
				for (const marker of markers) {
					if (marker.markerName == route.origStop) {
						const image = {
							url: "./assets/marker_blue.png",
							scaledSize: new google.maps.Size(24, 32),
							labelOrigin: new google.maps.Point(12, 12),
						}
						marker.icon = image;
					}
					if (marker.markerName == route.destStop) {
						const image = {
							url: "./assets/marker_red.png",
							scaledSize: new google.maps.Size(24, 32),
							labelOrigin: new google.maps.Point(12, 12),
						}
						marker.icon = image;
					}
				}
				busIcon1.classList.add("blue");
				busIcon2.classList.add("red");
			})
			name.textContent = route.name;
			id.textContent = route.id;
			if (route.active) {
				id.style.backgroundColor = "#509E2F";
			} else {
				id.style.backgroundColor = "#FFAA00";
			}

			recHeader.appendChild(via);
			recHeader.appendChild(name);
			recButton.appendChild(recHeader);
			recContent.appendChild(origWalk);
			recContent.appendChild(origin);
			recContent.appendChild(destination);
			recContent.appendChild(destWalk);
			recContent.appendChild(id);
			recButton.appendChild(recContent)
			recCard.appendChild(recButton);
		}
		recList.appendChild(recCard);
	}
	const routeCards = document.querySelectorAll(".route-card");
	for (const card of routeCards) {
		card.style.display = "none";
	}
	for (const card of routeCards) {
		for (const route of goodRoutes) {
			const id = card.getAttribute("route-id")
			if (id == route.id?.toLowerCase() || id == route.destID?.toLowerCase() || id == route.origID?.toLowerCase()) {
				card.style.display = "flex";
			}
		}
	}
}

setInterval(function() {
	const d = new Date();
	const day = d.getDay();
	const time = d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
	let nextStop;
	let nextStopIndex;
	let nextTimeIndex;

	console.log("Running interval update");
	for (const route of stopList) {
		let n = 0;
		while (route.timepoints[n].times[0] == "") {
			n++
		}
		const startTime = route.timepoints[n].times[0];
		const endTime = route.timepoints[route.timepoints.length - 1].times.slice(-1).toString();
		const routeSelector = '[route-id="' + route.routeID.toLowerCase() + '"]';
		let nextTime = endTime;
		const routeCard = document.querySelector(routeSelector);
		const stopText = routeCard.querySelector(".next-stop-name");
		const ID = routeCard.querySelector(".route-id");
		const minutes = routeCard.querySelector(".time-label");
		const timeText = routeCard.querySelector(".time-left");
		const indexText = routeCard.querySelector(".timepoint-num");

		if (!route.active.days.includes(day)) { // Route is inactive for today
			routeCard.classList.add("inactive");
			stopText.textContent = route.timepoints[0].name;
			ID.style.backgroundColor = "#FFAA00";
			indexText.textContent = n + 1;
			if (route.active.days.includes(day + 1)) {
				minutes.textContent = "tomorrow";
			} else {
				minutes.textContent = "Monday";
			}
		} else if (time <= startTime || time >= endTime) { // Route is inactive at this time
			routeCard.classList.add("inactive");
			stopText.textContent = route.timepoints[0].name;
			timeText.textContent = startTime;
			indexText.textContent = n + 1;
			if (startTime < time) {
				if (route.active.days.includes(day + 1)) {
					minutes.textContent = "tomorrow";
				} else {
					minutes.textContent = "Monday";
				}
			} else {
				minutes.textContent = "later today";
			}
			ID.style.backgroundColor = "#FFAA00";
		} else { // Route is active
			if (routeCard.classList.contains("inactive")) {
				routeCard.classList.remove("inactive");
			}
			ID.style.backgroundColor = "#509E2F";
			minutes.textContent = "minutes";
			for (let i = 0; i < route.timepoints.length; i++) {
				for (let j = 0; j < route.timepoints[i].times.length; j++) {
					if (route.timepoints[i].times[j] >= time) {
						if (route.timepoints[i].times[j] <= nextTime) {
							nextTime = route.timepoints[i].times[j];
							nextStop = route.timepoints[i].name;
							nextTimeIndex = j
							nextStopIndex = i + 1;
						}
					}
				}
			}
			routeCard.setAttribute("next-time", nextTime);
			const timepointList = routeCard.querySelector(".timepoint-list");
			while (timepointList.firstChild) {
				timepointList.removeChild(timepointList.firstChild);
			}
			for (let i = nextStopIndex; i < route.timepoints.length; i++) {
				const timepointContainer = document.createElement('div');
				timepointContainer.classList.add("timepoint-container");

				const labelContainer = document.createElement('div');
				labelContainer.classList.add("index-label");

				const routeTimepoint = document.createElement('p');
				routeTimepoint.textContent = route.timepoints[i].name;
				routeTimepoint.classList.add("nowrap-text");

				const number = document.createElement('p');
				number.classList.add('timepoint-num');
				number.textContent = i + 1;

				const nextTimepointTime = route.timepoints[i].times[nextTimeIndex];
				const routeTimepointTime = document.createElement('p')
				routeTimepointTime.textContent = nextTimepointTime;
				routeTimepointTime.classList.add("timepoint-time");

				labelContainer.appendChild(number);
				timepointContainer.appendChild(labelContainer);
				timepointContainer.appendChild(routeTimepoint);
				timepointContainer.appendChild(routeTimepointTime);

				timepointList.appendChild(timepointContainer)
			}
			for (let i = 0; i < nextStopIndex; i++) { //Repeat from start to show next cycle up to current position
				const nextTimepointTime = route.timepoints[i].times[nextTimeIndex + 1];
				if (nextTimepointTime) {
					const timepointContainer = document.createElement('div');
					timepointContainer.classList.add("timepoint-container");

					const labelContainer = document.createElement('div');
					labelContainer.classList.add("index-label");

					const routeTimepoint = document.createElement('p');
					routeTimepoint.textContent = route.timepoints[i].name;
					routeTimepoint.classList.add("nowrap-text");

					const number = document.createElement('p');
					number.classList.add('timepoint-num');
					number.textContent = i + 1;

					const nextTimepointTime = route.timepoints[i].times[nextTimeIndex + 1];
					const routeTimepointTime = document.createElement('p')
					routeTimepointTime.textContent = nextTimepointTime;
					routeTimepointTime.classList.add("timepoint-time");

					labelContainer.appendChild(number);
					timepointContainer.appendChild(labelContainer);
					timepointContainer.appendChild(routeTimepoint);
					timepointContainer.appendChild(routeTimepointTime);

					timepointList.appendChild(timepointContainer)
				}
			}
			stopText.textContent = nextStop;
			timeText.textContent = (Number((nextTime.slice(0, 2) * 60)) + Number(nextTime.slice(3, 5))) - (Number((time.slice(0, 2) * 60)) + Number(time.slice(3, 5)));
			indexText.textContent = nextStopIndex;
		}
	}
}, 60 * 1000)

function getCurrentLocation() {
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(
			(position) => {
				currentLocation = {
					lat: position.coords.latitude,
					lng: position.coords.longitude,
				};
			}
		);
	}
}

function animatePolyLine(polyline, count, passRoute, nextStopIndex, pause) {
	id = window.setInterval(async function() {
		const icons = polyline.get("icons");
		icons[0].offset = count / (30 * passRoute.animationScale) + "%";
		polyline.set("icons", icons);
		
		if (count == passRoute.animationPoints[nextStopIndex] * passRoute.animationScale) {
			await sleep(pause);
			window.clearInterval(id);
			if (nextStopIndex + 1 < passRoute.timepoints.length)
				animatePolyLine(polyline, (count + 1) % (3000 * passRoute.animationScale), passRoute, nextStopIndex + 1, passRoute.animationTimes[nextStopIndex + 1]);
			else
				animatePolyLine(polyline, (count + 1) % (3000 * passRoute.animationScale), passRoute, 0, passRoute.animationTimes[0]);
		}
		
		count = (count + 1) % (3000 * passRoute.animationScale);
	}, 20);
	return id;
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

getCurrentLocation();
window.initMap = initMap;
