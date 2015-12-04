(function($) {
	$.mapModule = function(options){
		
		var globals = {
			mapObject: {},
			currentOffice: -1,
			currentFloor: -1,
			officeList: [],
			activeLayers: [],
			levelControl: {},
		}
		
		var map = {
			options: $.extend({
				center: new L.LatLng(49.41923, 8.6783),
				zoom: 19,
				minZoom:18,
				maxZoom: 22,
				//imageBounds: [[49.41873, 8.67689], [49.41973, 8.67959]],
				//imageBoudns2: [[49.41873, 8.67689], [49.41973, 8.68073]],
				initialOffice: 1,
				initialFloor: 1,
				exposedForTesting: false,
			}, options),
			init: function(){
				globals.mapObject = new L.Map('map', {
						center: map.options.center,
						zoom: map.options.zoom,
						minZoom: map.options.minZoom,
						maxZoom: map.options.maxZoom
				});
				
				globals.currentOffice = map.options.initialOffice;
				globals.currentFloor = map.options.initialFloor;
				
				layers.createLayers({type:"FeatureCollection", "features":[]});
			},
			getMap(){
				return globals.mapObject;
			}
		};
		
		var buildings = {
			getOfficeList(){
				return globals.officeList;
			},
			getOffice: function(officeNum){
				var results = $.grep(globals.officeList, function(e){ return e.id === officeNum });
				if(results.length == 0){
					// office doesn't exist
					return undefined;
				}
				else if(results.length == 1){
					// exactly one match
					return results[0];
				}
				else{
					// more than one match
					throw 'The office with id: ' + officeNum + ' already exists.';
				}
			},
			getFloor: function(office, floorNum){
				var officeObject;
				if(typeof(office) === 'number'){
					officeObject = buildings.getOffice(office);
				}
				else{
					officeObject = office;
				}
				var floorList = $.grep(officeObject.floorList, function(e){ return e.floor === floorNum });
					if(floorList.length == 0){
						// floor does not exist yet
						return undefined;
					}
					else if(floorList.length == 1){
						// exactly one match
						return floorList[0];
					}
					else{
						// more than one match
						throw 'The floor with id: ' + floorNum + ' already exists.';
					}
			},
			addOffice: function(officeNum, officeName){
				if(buildings.getOffice(officeNum, officeName) === undefined){
					globals.officeList.push({
						'id': officeNum,
						'name' : officeName,
						'floorList': []
					});
					$('#officeList').append('<li><a href="#" id="office' + officeNum + '">' + officeName + '</a></li>');
				}
				else{
					throw 'The office with id: ' + officeNum + ' already exists.';
				}
			},
			addFloor: function(officeNum, floorNum, imageURL, imageBounds){
				var office = buildings.getOffice(officeNum);
				if(office != undefined){
					var floor = buildings.getFloor(office, floorNum);
					if(floor === undefined){
						var overlay = L.imageOverlay(imageURL, imageBounds, {opacity:0}).addTo(globals.mapObject);
						office.floorList.push({'floor': floorNum, 'url': imageURL, 'image': overlay, 'markers': []});
					}
					else{
						throw 'The floor with id: ' + floorNum + ' already exists.';
					}
				}
				else{
					throw 'The office with id: ' + officeNum + ' does not exist.';
				}
			},
		};
		
		var controls = {
			removeLevelControl: function(){
				if(globals.levelControl != undefined && !$.isEmptyObject(globals.levelControl)){
					globals.levelControl.removeFrom(globals.mapObject);
				}
			},
			addLevelControl: function(officeNum, floorNum){
				if(floorNum === undefined){
					floorNum = 1;
				}
				controls.removeLevelControl();
				var office = buildings.getOffice(officeNum);
				globals.levelControl = new L.Control.Level({
					level: '1',
					levels: controls.getLevels(officeNum)
				});
				globals.levelControl.setLevel(floorNum);
				globals.levelControl.addEventListener('levelchange', office.layer.setLevel, office.layer);
				globals.levelControl.addEventListener('levelchange', function(e){
					buildings.getFloor(globals.currentOffice, globals.currentFloor).image.setOpacity(0);
					buildings.getFloor(globals.currentOffice, e.newLevel).image.bringToFront()
					buildings.getFloor(globals.currentOffice, e.newLevel).image.setOpacity(1.0);
				});
				globals.levelControl.addEventListener('levelchange', function(e){globals.currentFloor = e.newLevel});
				globals.levelControl.addEventListener('levelchange', function(e){util.populateUserList()});
				globals.levelControl.addTo(globals.mapObject);
			},
			getLevels(officeNum){
				var levels = [];
				$.each(buildings.getOffice(officeNum).floorList, function(index, value){levels.push(value.floor)});
				if(levels.length <= 1){
					return [];
				}
				return levels;
			},
		};
		
		var layers = {
			createLayers: function(data){
				$.each(globals.officeList, function(index, office){
					$.each(office.floorList, function(index, floor){
						if(floor.markers){
							floor.markers = [];
						}
					});
					office.layer = new L.Indoor(data, {
						onEachFeature: util.onEachFeature,
						pointToLayer: util.pointToLayer,
						filter: function(feature, layer){
							if(feature.properties.office == office.id){
								return true;
							}
							else{
								return false;
							}
						}
					});
				});
			},
			createSearchLayers: function(data, searchString){
				$.each(globals.officeList, function(index, office){
					$.each(office.floorList, function(index, floor){
						if(floor.markers){
							floor.markers = [];
						}
					});
					globals.mapObject.removeLayer(office.layer);
					office.layer = new L.Indoor(data, {
						onEachFeature: util.onEachFeature,
						pointToLayer: util.pointToLayer,
						filter: function(feature, layer){
							if(feature.properties.office == office.id){
								var found = false;
								$.each(feature.users, function(index, user){
									var name = user.firstName + ' ' + user.lastName;
                                    var dept = user.department;
									if(name.toLowerCase().trim().indexOf(searchString) > -1){
										found = true;
										return;
									}
                                    //possible change, messes a bit with found
                                    if(dept.toLowerCase().trim().indexOf(searchString) > -1){
										found = true;
										return;
									}
                                    
								});
								if(found){
									return true;
								}
							}
							return false;
						}
					});
				});
			},
			refreshLayer: function (){
				var layer = buildings.getOffice(globals.currentOffice).layer;
				layers.clearLayers();
				layer.setLevel(globals.currentFloor);
				layer.addTo(globals.mapObject);
				globals.activeLayers.push(layer);
				controls.addLevelControl(globals.currentOffice, globals.currentFloor);
			},
			clearLayers: function(){
				$.each(globals.activeLayers, function(index, value){
					globals.mapObject.removeLayer(value);
					globals.activeLayers.pop(value);
				});
			},
			changeOfficeLayer: function(officeNum){
				var layer = buildings.getOffice(officeNum).layer;
				layers.clearLayers();
				layer.addTo(globals.mapObject);
				globals.activeLayers.push(layer);
				layer.setLevel(1);
				//buildings.changeFloor(officeNum, 1);
				buildings.getFloor(globals.currentOffice, globals.currentFloor).image.setOpacity(0);
				buildings.getFloor(officeNum, 1).image.bringToFront();
				buildings.getFloor(officeNum, 1).image.setOpacity(1.0);
				globals.currentFloor = 1;
				controls.addLevelControl(officeNum);
				globals.currentOffice = officeNum;
			},
		};
		
		var util = {
			geojsonMarkerOptions: L.divIcon({
				className: 'map-marker',
				iconSize: [16, 16],
				iconAnchor: [8, 16],
				popupAnchor: [0, -18],
				html: ''
			}),
			getVisibleMarkers(){
				var markers = buildings.getOffice(globals.currentOffice).floorList[globals.currentFloor - 1].markers;
				var bounds = globals.mapObject.getBounds();
				console.log(markers);
				console.log(bounds);
				var results = [];
				$.each(markers, function(key, value){
					if(bounds.contains(value._latlng)){
						console.log(value.feature.users[0].firstName);
						results.push(value);
					}
				});
				return results;
			},
			populateUserList(){
				var visibleUsers = util.getVisibleMarkers();
				$('#user-results').html('');
				$.each(visibleUsers, function(index, value){
					var user = value.feature.users[0];
					var name = user.firstName + ' ' + user.lastName;
					var id = user.id;
                    var dept = user.department;
					var email = user.email;
					var phone = user.phone;
					$('#user-results').append('' +
					'<div id="user-' + id + '" class="user-container">' +
						'<div class="user-box">' +
							'<div class="user-picture">' +
								'<img src="images/default-user.png">' +
							'</div>' +
							'<div class="user-info">' +
								'<h3 class="user-info-title">' + name +
									' (<a href="mailto:' + email + '">' + email + '</a>)</h3>' +
								'<div class="user-info-details">' + dept + '</div>' +
								'<div class="user-info-details">' + phone + '</div>' +
							'</div>' +
						'</div>' + 
					'</div>');
					
					if(value.feature.properties.clicked || value.feature.properties.hover){
						$('#user-' + id).css('background-color', '#333');
						value.setIcon(new L.Icon.Default());
					}
					
					if(!value.feature.properties.clicked && !value.feature.properties.hover){
						$('#user-' + id).css('background-color', '#222');
						value.setIcon(util.geojsonMarkerOptions);
					}
					
					$('#user-' + id).hover(
						function(event){
							value.setIcon(new L.Icon.Default());
							value.openPopup();
							$('#user-' + id).css('background-color', '#333');
						},
						function(event){
							if(!value.feature.properties.clicked){
								value.setIcon(util.geojsonMarkerOptions);
								value.closePopup();
								$('#user-' + id).css('background-color', '#222');
							}
						}
					);
					
					$('#user-' + id).click(function(event){
						if(!value.feature.properties.clicked){
							value.setIcon(new L.Icon.Default());
							value.openPopup();
							$('#user-' + id).css('background-color', '#333');
							value.feature.properties.clicked = true;
						}
						else{
							value.feature.properties.clicked = false;
							value.setIcon(util.geojsonMarkerOptions);
							value.closePopup();
							$('#user-' + id).css('background-color', '#222');
						}
					});
				});
			},
			onEachFeature: function(feature, layer){
				if(feature.users.length > 0){
					$.each(feature.users, function(index, user){
						var name, department, office, email, location, phone;
						name = user.firstName + ' ' + user.lastName;
						if(feature.properties.office==1){
							office =  'Conshohocken';
						}
						else if(feature.properties.office==2){
							office = 'San Diego';
						}
						department = user.department;
						email = user.email;
						location = user.city;
						phone = user.phone;
						
						feature.properties.popupContent = '' +
						'<div class="user-container">' +
							'<div class="user-box">' +
								'<div class="user-picture">' +
									'<img src="images/default-user.png">' +
								'</div>' +
								'<div class="user-info">' +
									'<h3 class="user-info-title">' + name + ' (' + email + ')</h3>' +
									'<div class="user-info-details">' + department + '</div>' +
									'<div class="user-info-details">' + phone + '</div>' +
								'</div>' +
							'</div>' +
						'</div>';
						
						layer.bindPopup(feature.properties.popupContent);
						
						var userTable ='' +
							'<div class="table-responsive">' +
								'<table class="table table-condensed">' +
								  '<tr>' +
									'<th>Name</th>' +
									'<th>Office</th> ' +
									'<th>Physical Location</th>' +
									'<th>Email</th>' +
									'<th>Phone</th>' +
								  '</tr>' +
								  '<tr>' +
									'<td>' + name + '</td>' +
									'<td>' + office + '</td> ' +
									'<td>' + location + '</td>' +
									'<td>' + email + '</td>' +
									'<td>' + phone + '</td>' +
								  '</tr>' +
								'</table>' +
							'</div>';
					
						// if clicked open popup but also set a flag so mouseout doesn't close popup
						layer.on('click', function(e){
							if(this.feature.properties.clicked){
								this.feature.properties.clicked = false;
								this.closePopup();
							}
							else{
								this.feature.properties.clicked = true;
								this.openPopup();
							}
							util.populateUserList();
							$('#userInfo').html(userTable);
						});
						
						// unset clicked flag so mouseout works properly after a click event
						layer.on('popupclose', function(e){
							$('#userInfo').html('');
						});
						
						layer.on('mouseover', function(e){
							this.openPopup();
							if(!this.feature.properties.clicked){
								this.feature.properties.hover = true;
								util.populateUserList();
							}
							$('#userInfo').html(userTable);
						});
						
						layer.on('mouseout', function(e){
							if(this.feature.properties.hover){
								this.feature.properties.hover = false;
								util.populateUserList();
							}
						});
					});
				}
			},
			pointToLayer: function(feature, latlng){
				console.log(feature);
				console.log(latlng);
				var marker = L.marker(latlng, {icon: util.geojsonMarkerOptions});
				var office = buildings.getOffice(feature.properties.office);
				console.log(office);
				office.floorList[feature.properties.level - 1].markers.push(marker);
				return marker;
			},
			getGlobals: function(){
				var globals = {
					
				}
			}
		};
		
		if(!map.options.exposedForTesting){
			return {
				init: map.init,
				addOffice: buildings.addOffice,
				addFloor: buildings.addFloor,
				getOfficeList: buildings.getOfficeList,
				createLayers: layers.createLayers,
				changeOfficeLayer: layers.changeOfficeLayer,
				refreshLayer: layers.refreshLayer,
				createSearchLayers: layers.createSearchLayers,
				getMap: map.getMap,
				getVisibleMarkers: util.getVisibleMarkers,
				populateUserList: util.populateUserList,
			};
		}
		else if(map.options.exposedForTesting){
			return {
				// globals
				mapObject: globals.mapObject,
				currentOffice: globals.currentOffice,
				currentFloor: globals.currentFloor,
				officeList: globals.officeList,
				activeLayers: globals.activeLayers,
				levelControl: globals.levelControl,
				
				// map
				options: map.options,
				init: map.init,
				getMap: map.getMap,
				
				// buildings
				getOfficeList: buildings.getOfficeList,
				getOffice: buildings.getOffice,
				getFloor: buildings.getFloor,
				addOffice: buildings.addOffice,
				addFloor: buildings.addFloor,
				
				// controls
				removeLevelControl: controls.removeLevelControl,
				addLevelControl: controls.addLevelControl,
				getLevels: controls.getLevels,
				
				// layers
				createLayers: layers.createLayers,
				createSearchLayers: layers.createSearchLayers,
				refreshLayer: layers.refreshLayer,
				clearLayers: layers.clearLayers,
				changeOfficeLayer: layers.changeOfficeLayer,
				
				// util
				geojsonMarkerOptions: util.geojsonMarkerOptions,
				getVisibleMarkers: util.getVisibleMarkers,
				populateUserList: util.populateUserList,
				onEachFeature: util.onEachFeature,
				pointToLayer: util.pointToLayer,
				
			};
		}
	}
})(jQuery);