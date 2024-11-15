import L from 'leaflet';
import { Hexagon, Circle, PencilLine, MapPin, Edit } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import MenuComponent from './MenuComponent';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';

const MapComponent = () => {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const [polygonPoints, setPolygonPoints] = useState([]);
    const [polylinePoints, setPolylinePoints] = useState([]);
    const [rectangleBounds, setRectangleBounds] = useState(null);
    const [circleData, setCircleData] = useState(null);
    const [markerPosition, setMarkerPosition] = useState({ lat: '', lng: '' });
    const [showPopover, setShowPopover] = useState(false);
    const drawnItems = useRef(new L.FeatureGroup());
    const [isEditing, setIsEditing] = useState(false);
    const [createdShapes, setCreatedShapes] = useState([]);
    const [createdMission, setCreatedMission] = useState(null); // State untuk nama misi yang dibuat
    const [missionList, setMissionList] = useState([]);

    // Fungsi untuk menyimpan data
    const saveShape = async (shapeData) => {
        try {
            const response = await fetch('http://localhost:3000/api/shapes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(shapeData)
            });

            if (!response.ok) {
                throw new Error('Failed to save shape');
            }
            const savedShape = await response.json();
            console.log('Shape saved:', savedShape);
        } catch (error) {
            console.error('Error saving shape:', error);
        }
    };
    
    // Fungsi mengirim data ke backend
    const handleSaveShapes = async (missionName) => {
        if(missionName.trim()) {
            try {
                for (const shape of createdShapes) {
                    const shapeData = { ...shape, missionName };
                    await saveShape(shapeData);
                }
                setCreatedShapes([]); // Kosongkan state setelah data disimpan
                alert('All shapes have been saved successfully!');
            } catch (error) {
                console.error('Error saving shapes:', error);
                alert('Failed to save some shapes. Please try again.');
            }
        }
        else {
            alert("Please enter a valid mission name.");
        }
    };

    const onCreateMission = (missionName) => {
        if (!missionName) {
            alert("Please enter a mission name");
            return;
        }
        setCreatedMission(missionName);
        handleSaveShapes(missionName);

        // Add the mission to the mission list
        setMissionList((prevList) => {
            const updatedList = [...prevList, missionName];
            return updatedList;
        });
        console.log("Mission Created:", missionName);
    }

    useEffect(() => {
        if (mapInstance.current) {
            const drawControl = new L.Control.Draw({
                draw: {
                    marker: true, // Pastikan marker diaktifkan
                },
                edit: {
                    featureGroup: drawnItems.current,
                },
            });
        }
        
        if (mapRef.current && !mapInstance.current) {
            // Initialize the map
            mapInstance.current = L.map(mapRef.current).setView(
                [-7.773179090390894, 110.37823736303379], 15
            );

            // Add tile layer
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            }).addTo(mapInstance.current);

            // Marker with popup
            const marker = L.marker([-7.773179090390894, 110.37823736303379]).addTo(mapInstance.current);
            marker.bindPopup("This is GAMAFORCE!").openPopup();

            // Event listener untuk menangkap bentuk yang dibuat
            mapInstance.current.on(L.Draw.Event.CREATED, (event) => {
                const layer = event.layer;
                drawnItems.current.addLayer(layer);
                let shapeData;

                if (event.layerType === 'polygon') {
                    const points = layer.getLatLngs()[0].map((point) => [point.lat, point.lng]);
                    shapeData = { 
                        missionName: createdMission, 
                        type: event.layerType,
                        coordinates: points 
                    };
                    setPolygonPoints(points);
                } 
                else if (event.layerType === 'polyline') {
                    const points = layer.getLatLngs().map((point) => [point.lat, point.lng]);
                    shapeData = { 
                        missionName: createdMission,
                        type: event.layerType,
                        coordinates: points 
                    };
                    setPolylinePoints(points);
                } 
                else if (event.layerType === 'circle') {
                    const center = layer.getLatLng();
                    const radius = layer.getRadius();
                    shapeData = { 
                        missionName: createdMission,
                        type: event.layerType,
                        center: [center.lat, center.lng], 
                        radius 
                    };
                    setCircleData({ center: [center.lat, center.lng], radius });
                } 
                else if (event.layerType === 'marker') {
                    const position = layer.getLatLng();
                    shapeData = { 
                        missionName: createdMission,
                        type: 'marker',
                        coordinates: [position.lat, position.lng] 
                    };
                    console.log('Marker detected:', shapeData); // Debug log
                    setMarkerPosition(position);
                }

                // Tambahkan data shapeData ke state createdShapes
                setCreatedShapes((prevShapes) => [...prevShapes, shapeData]);

                // Tambahkan layer ke peta
                layer.addTo(mapInstance.current);
            });
        }
    }, []);

    // Toggle popover visibility
    const togglePopover = () => {
        setShowPopover((prev) => !prev);
    };

    // Fungsi untuk memulai mode menggambar poligon
    const handleDrawPolygon = () => {
        if (mapInstance.current) {
            const drawPolygon = new L.Draw.Polygon(mapInstance.current, {
                shapeOptions: {
                    color: 'blue',
                    weight: 2,
                    fillColor: '#3388ff',
                    fillOpacity: 0.4,
                }
            });
            drawPolygon.enable();
        }
    };

    // Fungsi untuk menggambar garis
    const handleDrawLine = () => {
        const drawLine = new L.Draw.Polyline(mapInstance.current, {
            shapeOptions: {
                color: 'black',
                weight: 2,
            }
        });
        drawLine.enable();
    };

    // Fungsi untuk menambahkan marker pada koordinat yang diinputkan
    const handleAddMarker = () => {
        const { lat, lng } = markerPosition;
        if (mapInstance.current && lat && lng) {
            const marker = L.marker([parseFloat(lat), parseFloat(lng)]).addTo(mapInstance.current);
            marker.bindPopup(`Marker at [${lat}, ${lng}]`).openPopup();
            setShowPopover(false); // Tutup popover setelah menambahkan marker
        }
    };

    // Fungsi untuk mengupdate koordinat marker berdasarkan input
    const handleMarkerPositionChange = (e) => {
        const { name, value } = e.target;
        setMarkerPosition((prev) => ({ ...prev, [name]: value }));
    };

    // Fungsi untuk menggambar lingkaran
    const handleDrawCircle = () => {
        const drawCircle = new L.Draw.Circle(mapInstance.current, {
            shapeOptions: {
                color: 'red',
                weight: 2,
                fillColor: '#ff6666',
                fillOpacity: 0.4,
            }
        });
        drawCircle.enable();
    };

    // Toggle edit mode
    const handleEditMode = () => {
        setIsEditing(!isEditing);
        if (isEditing) {
            mapInstance.current.eachLayer((layer) => {
                if (drawnItems.current.hasLayer(layer) && layer.editing) {
                    layer.editing.disable();
                }
            });
        } else {
            drawnItems.current.eachLayer((layer) => {
                if (layer.editing) layer.editing.enable();
            });
        }
    };

    return (
        <div className='relative flex items-center'>
            
            {/* Create Mission Button */}
            <div className='absolute w-full h-screen bg-transparent'>
                    <MenuComponent onCreateMission={onCreateMission}/>
                    <div>{createdMission && <p>Misi Dibuat: {createdMission}</p>}</div>
            </div>
            
            {/* Container untuk peta */}
            <div ref={mapRef} className="w-screen h-screen mt-16 z-0" style={{ width: "100%", height: "calc(100vh - 4rem)" }} />


            <div className='absolute left-0 top-52 lg:top-48 flex items-start z-10'>
                <div className="flex flex-col items-start gap-2 px-2 max-w-96 sm:max-w-md lg:max-w-lg">
                    
                    {/* Tombol Kustom untuk Memulai Mode Gambar */}
                    <button onClick={handleDrawPolygon} className="border-2 border-white px-2 py-2 bg-blue-950 text-white rounded-xl">
                        <Hexagon />
                    </button>

                    {/* Tombol Kustom untuk Memulai Mode Gambar */}
                    <button onClick={handleDrawLine} className="border-2 border-white px-2 py-2 bg-blue-950 text-white rounded-xl">
                        <PencilLine />
                    </button>

                    {/* Tombol Kustom untuk Memulai Mode Gambar */}
                    <button onClick={togglePopover} className="border-2 border-white px-2 py-2 bg-blue-950 text-white rounded-xl">
                        <MapPin />
                    </button>

                    {/* Popover untuk input koordinat */}
                    {showPopover && (
                        <div className="absolute left-16 p-4 bg-white bg-opacity-70 border rounded-lg shadow-lg w-48 z-20">
                            <h3 className="text-sm font-semibold mb-2">Set Marker Position</h3>
                            <input
                                type="text"
                                name="lat"
                                placeholder="Latitude"
                                value={markerPosition.lat}
                                onChange={handleMarkerPositionChange}
                                className="border-2 border-blue-950 px-2 py-1 mb-2 w-full rounded"
                            />
                            <input
                                type="text"
                                name="lng"
                                placeholder="Longitude"
                                value={markerPosition.lng}
                                onChange={handleMarkerPositionChange}
                                className="border-2 border-blue-950 px-2 py-1 mb-2 w-full rounded"
                            />
                            <button onClick={handleAddMarker} className="w-full border-2 border-blue-950 px-2 py-1 bg-blue-500 text-white rounded">
                                Add Marker
                            </button>
                        </div>
                    )}
                    
                    {/* Tombol Kustom untuk Memulai Mode Gambar */}
                    <button onClick={handleDrawCircle} className="border-2 border-white px-2 py-2 bg-blue-950 text-white rounded-xl">
                        <Circle />
                    </button>

                    {/* Button untuk editing */}
                    <button onClick={handleEditMode} className={`border-2 px-2 py-2 ${isEditing ? 'bg-green-500' : 'bg-blue-950'} text-white rounded-xl`}>
                        <Edit />
                    </button>

                    {/* Jika ingin Menampilkan atau menyimpan misi */}
                    {/* <div className="border-2 border-blue-950 bg-white p-4 rounded-md max-h-36 overflow-y-auto max-w-34">
                        <h3>Selected Polygon:</h3>
                        <pre>{JSON.stringify(polygonPoints, null, 2)}</pre>
                    </div>
                    <div className="border-2 border-blue-950 bg-white p-4 rounded-md max-h-36 overflow-y-auto max-w-34">
                        <h3>Selected Polyline:</h3>
                        <pre>{JSON.stringify(polylinePoints, null, 2)}</pre>
                    </div>
                    <div className="border-2 border-blue-950 bg-white p-4 rounded-md max-h-36 overflow-y-auto max-w-34">
                        <h3>Selected Circle:</h3>
                        <pre>{JSON.stringify(circleData, null, 2)}</pre>
                    </div>
                    <div className="border-2 border-blue-950 bg-white p-4 rounded-md max-h-36 overflow-y-auto max-w-34">
                        <h3>Selected Rectangle:</h3>
                        <pre>{JSON.stringify(rectangleBounds, null, 2)}</pre>
                    </div> */}
                </div>
            </div>
        </div>
    );
};

export default MapComponent;
