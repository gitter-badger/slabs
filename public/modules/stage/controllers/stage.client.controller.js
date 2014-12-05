/* global $:false */
/* global settingsFrame:false */
/* global window:false */
/* global jsPlumb:false */
'use strict';

// todo - tests for this class.
// todo - use controllerAs syntax with a vm var.
// todo - move bindable members to the top : https://github.com/johnpapa/angularjs-styleguide#style-y033
// todo - move jsPlumb to service or directive?

angular.module('stage').controller('StageController', ['$scope','$state','SlabsServices','$sce',

	function($scope, $state, SlabsServices, $sce ) {

		$state.go('stage.sidebar');

		// initialize the slabs array.
		$scope.slabs = [];

		$scope.settingsPageVisible = false;

		$scope.runSlabNetwork = function(){

			var networkObject = {
				title : 'sample network',
				slabs : $scope.slabs
			};

			console.log(networkObject);

			SlabsServices.network.save({}, networkObject,
				function(resp){
				  console.log('network success!!');
					console.log(resp);
			},function(resp){
					console.log('network fail...');
					console.log(resp);
			});
		};

		$scope.openSlabSettings = function(slab){

			SlabsServices.slab.get({slabType:slab.type, slabID:slab.id}, function(obj){

				if(obj.file){

					$scope.settingsPageVisible = true;

					// write the settings file to the settings iFrame
					var iFrame = settingsFrame.contentWindow;
					iFrame.document.open();
					iFrame.document.write(obj.file);
					iFrame.document.close();

				}else{
					console.log('error loading settings file');
				}

			});

		};

		var init = function(connection) {

			var targetId = $(connection.target).data('slab-name');
			var sourceId = $(connection.source).data('slab-name');

			connection.getOverlay('label').setLabel( sourceId+ ' - ' + targetId);
			connection.bind('editCompleted', function(o) {
				if (typeof console !== 'undefined')
					console.log('connection edited. path is now ', o.path);
			});
		};

		var instance;
		var _addEndpoints;

		var initPlumb = function(){

			instance = jsPlumb.getInstance({
				// default drag options
				DragOptions : { cursor: 'pointer', zIndex:2000 },
				// the overlays to decorate each connection with.  note that the label overlay uses a function to generate the label text; in this
				// case it returns the 'labelText' member that we set on each connection in the 'init' method below.
				ConnectionOverlays : [
					[ 'Label', {
						location:0.1,
						id:'label',
						cssClass:'aLabel'
					}]
				],
				Container:'stage-container'
			});

			var connectorPaintStyle = {
				lineWidth:4,
				strokeStyle:'#61B7CF',
				joinstyle:'round',
				outlineColor:'white',
				outlineWidth:2
			};
			var connectorHoverStyle = {
				lineWidth:4,
				strokeStyle:'#216477',
				outlineWidth:2,
				outlineColor:'white'
			};
			var endpointHoverStyle = {
				fillStyle:'#216477',
				strokeStyle:'#216477'
			};

			var sourceEndpoint = {
				endpoint:'Dot',
				paintStyle:{
					strokeStyle:'#7AB02C',
					fillStyle:'transparent',
					radius:4,
					lineWidth:3
				},
				isSource:true,
				connector:[ 'Flowchart', { stub:[40, 60], gap:10, cornerRadius:5, alwaysRespectStubs:true } ],
				connectorStyle:connectorPaintStyle,
				hoverPaintStyle:endpointHoverStyle,
				connectorHoverStyle:connectorHoverStyle,
				dragOptions:{}
			};

			// the definition of target endpoints (will appear when the user drags a connection)
			var targetEndpoint = {
					endpoint:'Dot',
					paintStyle:{ strokeStyle:'#5bc0de',radius:4, fillStyle:'transparent',lineWidth:3 },
					hoverPaintStyle:endpointHoverStyle,
					maxConnections:-1,
					dropOptions:{ hoverClass:'hover', activeClass:'active' },
					isTarget:true
				};

			_addEndpoints = function(toId, sourceAnchors, targetAnchors) {
				for (var i = 0; i < sourceAnchors.length; i++) {
					var sourceUUID = toId + sourceAnchors[i];
					instance.addEndpoint(toId, sourceEndpoint, { anchor:sourceAnchors[i], uuid:sourceUUID });
				}
				for (var j = 0; j < targetAnchors.length; j++) {
					var targetUUID = toId + targetAnchors[j];
					instance.addEndpoint(toId, targetEndpoint, { anchor:targetAnchors[j], uuid:targetUUID });
				}
			};

		};

		setTimeout(function(){
			initPlumb();
		}, 0);




		$('.stage').droppable({

			drop: function( event, ui ) {

				var item 			= ui.helper[0];

				// is slab dropped from the stage or sidebar list.
				var isPanel		= item.classList.contains('panel') === true ? true : false;
				if( isPanel ){
					return;
				}

				// slab settings
				var slabID 		= item.getAttribute('data-slab-id');
				var slabType  = item.getAttribute('data-slab-type');
				var slabName  = item.getAttribute('data-slab-name');
				var guid 			= 'slab_'+Date.now();
				var left			= ui.position.left;
				var top				= ui.position.top - 50; // the 50 is the header

				var slab = {
					guid  :guid,
					id		:slabID,
					type	:slabType,
					name	:slabName,
					left	:left,
					top		:top
				};

				// add slab to slab network
				$scope.slabs.push(slab);
				$scope.$digest();

				// get number of connections in/out
				var slabsIn		= item.getAttribute('data-slab-in');
				var slabsOut  = item.getAttribute('data-slab-out');

				var inConnectorsArray = ['TopCenter', 'TopLeft', 'TopRight'];
				var outConnectorsArray = ['BottomCenter', 'BottomLeft', 'BottomRight'];

				inConnectorsArray.length = slabsIn;
				outConnectorsArray.length = slabsOut;

				_addEndpoints(guid, outConnectorsArray, inConnectorsArray);

				// listen for new connections; initialise them the same way we initialise the connections at startup.
				instance.bind('connection', function(connInfo, originalEvent) {
					init(connInfo.connection);
				});

				instance.draggable(jsPlumb.getSelector('.stage-container .panel'), { grid: [20, 20] });

			}

		});

		// add sumbit data function
		window.submitSlabData = function(data){
			$scope.settingsPageVisible = false;
			$scope.$digest();
		};


	}

]);
