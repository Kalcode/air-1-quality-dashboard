import React, { useState, useRef, useCallback, useEffect } from "react";

const PLANTS = [
	{ id: "tomato", name: "Tomato", color: "#ef4444", icon: "🍅" },
	{ id: "pepper", name: "Pepper", color: "#f97316", icon: "🫑" },
	{ id: "carrot", name: "Carrot", color: "#fb923c", icon: "🥕" },
	{ id: "lettuce", name: "Lettuce", color: "#84cc16", icon: "🥬" },
	{ id: "cucumber", name: "Cucumber", color: "#22c55e", icon: "🥒" },
	{ id: "zucchini", name: "Zucchini", color: "#16a34a", icon: "🥒" },
	{ id: "corn", name: "Corn", color: "#eab308", icon: "🌽" },
	{ id: "bean", name: "Bean", color: "#65a30d", icon: "🫘" },
	{ id: "pea", name: "Pea", color: "#4ade80", icon: "🫛" },
	{ id: "onion", name: "Onion", color: "#a855f7", icon: "🧅" },
	{ id: "garlic", name: "Garlic", color: "#e9d5ff", icon: "🧄" },
	{ id: "potato", name: "Potato", color: "#a16207", icon: "🥔" },
	{ id: "herb", name: "Herbs", color: "#059669", icon: "🌿" },
	{ id: "flower", name: "Flower", color: "#ec4899", icon: "🌸" },
	{ id: "strawberry", name: "Strawberry", color: "#dc2626", icon: "🍓" },
	{ id: "squash", name: "Squash", color: "#ca8a04", icon: "🎃" },
	{ id: "broccoli", name: "Broccoli", color: "#15803d", icon: "🥦" },
	{ id: "eggplant", name: "Eggplant", color: "#7c3aed", icon: "🍆" },
];

const STORAGE_KEY = "garden-plan2ner-data";
const MAX_IMAGE_SIZE = 1.5 * 1024 * 1024; // 1.5MB max for image to leave room for other data

// Compress image by resizing if needed
const compressImage = (dataUrl, maxSize) => {
	return new Promise((resolve) => {
		// Check current size
		const currentSize = dataUrl.length * 0.75; // Approximate bytes from base64
		if (currentSize <= maxSize) {
			resolve(dataUrl);
			return;
		}

		const img = new Image();
		img.onload = () => {
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");

			// Calculate scale factor to reduce file size
			const scaleFactor = Math.sqrt(maxSize / currentSize);
			const newWidth = Math.floor(img.width * scaleFactor);
			const newHeight = Math.floor(img.height * scaleFactor);

			canvas.width = newWidth;
			canvas.height = newHeight;

			ctx.drawImage(img, 0, 0, newWidth, newHeight);

			// Try JPEG for better compression
			let compressed = canvas.toDataURL("image/jpeg", 0.8);

			// If still too big, reduce quality further
			if (compressed.length * 0.75 > maxSize) {
				compressed = canvas.toDataURL("image/jpeg", 0.6);
			}

			resolve(compressed);
		};
		img.src = dataUrl;
	});
};

export default function GardenPlanner() {
	const [image, setImage] = useState(null);
	const [gridConfig, setGridConfig] = useState({
		rows: 6,
		cols: 8,
		opacity: 0.7,
		imageOpacity: 1,
		x: 50,
		y: 50,
		width: 500,
		height: 350,
	});
	const [garden, setGarden] = useState({});
	const [selectedPlant, setSelectedPlant] = useState(null);
	const [isRepositioning, setIsRepositioning] = useState(false);
	const [isResizing, setIsResizing] = useState(false);
	const [dragStart, setDragStart] = useState(null);
	const [dragPlant, setDragPlant] = useState(null);
	const [isExporting, setIsExporting] = useState(false);
	const [saveStatus, setSaveStatus] = useState(null);
	const containerRef = useRef(null);
	const exportRef = useRef(null);
	const fileInputRef = useRef(null);
	const isInitialLoad = useRef(true);

	// Load from localStorage on mount
	useEffect(() => {
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) {
				const data = JSON.parse(saved);
				if (data.image) setImage(data.image);
				if (data.gridConfig) setGridConfig(data.gridConfig);
				if (data.garden) setGarden(data.garden);
				setSaveStatus("Loaded saved garden");
				setTimeout(() => setSaveStatus(null), 2000);
			}
		} catch (err) {
			console.error("Failed to load saved data:", err);
		}
		isInitialLoad.current = false;
	}, []);

	// Save to localStorage when things change
	useEffect(() => {
		if (isInitialLoad.current) return;

		const saveData = async () => {
			try {
				let imageToSave = image;

				// Compress image if needed
				if (image) {
					imageToSave = await compressImage(image, MAX_IMAGE_SIZE);
				}

				const data = {
					image: imageToSave,
					gridConfig,
					garden,
				};

				localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
				setSaveStatus("Saved");
				setTimeout(() => setSaveStatus(null), 1500);
			} catch (err) {
				console.error("Failed to save:", err);
				if (err.name === "QuotaExceededError") {
					setSaveStatus("Image too large to save");
				} else {
					setSaveStatus("Save failed");
				}
				setTimeout(() => setSaveStatus(null), 3000);
			}
		};

		// Debounce saves
		const timeout = setTimeout(saveData, 500);
		return () => clearTimeout(timeout);
	}, [image, gridConfig, garden]);

	const clearSavedData = () => {
		if (confirm("Clear all saved data? This will reset the garden planner.")) {
			localStorage.removeItem(STORAGE_KEY);
			setImage(null);
			setGarden({});
			setGridConfig({
				rows: 6,
				cols: 8,
				opacity: 0.7,
				imageOpacity: 1,
				x: 50,
				y: 50,
				width: 500,
				height: 350,
			});
			setSaveStatus("Data cleared");
			setTimeout(() => setSaveStatus(null), 2000);
		}
	};

	const cellKey = (row, col) => `${row}-${col}`;

	const handleImageUpload = (e) => {
		const file = e.target.files[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (event) => {
				setImage(event.target.result);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleDrop = useCallback((e) => {
		e.preventDefault();
		const file = e.dataTransfer.files[0];
		if (file && file.type.startsWith("image/")) {
			const reader = new FileReader();
			reader.onload = (event) => {
				setImage(event.target.result);
			};
			reader.readAsDataURL(file);
		}
	}, []);

	const handleDragOver = (e) => {
		e.preventDefault();
	};

	const handleCellClick = (row, col) => {
		if (isRepositioning || isResizing) return;

		const key = cellKey(row, col);
		if (garden[key]) {
			const newGarden = { ...garden };
			delete newGarden[key];
			setGarden(newGarden);
		} else if (selectedPlant) {
			setGarden({ ...garden, [key]: selectedPlant });
		}
	};

	const handlePlantDragStart = (e, row, col) => {
		if (isRepositioning || isResizing) return;
		const key = cellKey(row, col);
		if (garden[key]) {
			setDragPlant({ plant: garden[key], fromKey: key });
			e.dataTransfer.effectAllowed = "move";
		}
	};

	const handlePlantDrop = (e, row, col) => {
		e.preventDefault();
		e.stopPropagation();
		if (isRepositioning || isResizing) return;

		const key = cellKey(row, col);
		if (dragPlant && !garden[key]) {
			const newGarden = { ...garden };
			delete newGarden[dragPlant.fromKey];
			newGarden[key] = dragPlant.plant;
			setGarden(newGarden);
		}
		setDragPlant(null);
	};

	const handleGridMouseDown = (e, action) => {
		e.preventDefault();
		e.stopPropagation();

		const rect = containerRef.current.getBoundingClientRect();
		setDragStart({
			x: e.clientX,
			y: e.clientY,
			gridX: gridConfig.x,
			gridY: gridConfig.y,
			gridWidth: gridConfig.width,
			gridHeight: gridConfig.height,
		});

		if (action === "move") {
			setIsRepositioning(true);
		} else if (action === "resize") {
			setIsResizing(true);
		}
	};

	const handleMouseMove = useCallback(
		(e) => {
			if (!dragStart) return;

			const dx = e.clientX - dragStart.x;
			const dy = e.clientY - dragStart.y;

			if (isRepositioning) {
				setGridConfig((prev) => ({
					...prev,
					x: Math.max(0, dragStart.gridX + dx),
					y: Math.max(0, dragStart.gridY + dy),
				}));
			} else if (isResizing) {
				setGridConfig((prev) => ({
					...prev,
					width: Math.max(100, dragStart.gridWidth + dx),
					height: Math.max(100, dragStart.gridHeight + dy),
				}));
			}
		},
		[dragStart, isRepositioning, isResizing],
	);

	const handleMouseUp = useCallback(() => {
		setIsRepositioning(false);
		setIsResizing(false);
		setDragStart(null);
	}, []);

	React.useEffect(() => {
		if (isRepositioning || isResizing) {
			window.addEventListener("mousemove", handleMouseMove);
			window.addEventListener("mouseup", handleMouseUp);
			return () => {
				window.removeEventListener("mousemove", handleMouseMove);
				window.removeEventListener("mouseup", handleMouseUp);
			};
		}
	}, [isRepositioning, isResizing, handleMouseMove, handleMouseUp]);

	const plantCounts = Object.values(garden).reduce((acc, plant) => {
		acc[plant.id] = (acc[plant.id] || 0) + 1;
		return acc;
	}, {});

	const usedPlants = PLANTS.filter((p) => plantCounts[p.id]);

	const clearGarden = () => setGarden({});

	const loadHtml2Canvas = () => {
		return new Promise((resolve, reject) => {
			if (window.html2canvas) {
				resolve(window.html2canvas);
				return;
			}

			const script = document.createElement("script");
			script.src =
				"https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
			script.onload = () => resolve(window.html2canvas);
			script.onerror = reject;
			document.head.appendChild(script);
		});
	};

	const downloadPNG = async () => {
		if (!image) return;

		setIsExporting(true);

		// Wait for the export view to render
		await new Promise((resolve) => setTimeout(resolve, 100));

		try {
			const html2canvas = await loadHtml2Canvas();

			const canvas = await html2canvas(exportRef.current, {
				backgroundColor: "#fafaf9",
				scale: 2,
				useCORS: true,
			});

			const link = document.createElement("a");
			link.download = `garden-plan-${new Date().toISOString().split("T")[0]}.png`;
			link.href = canvas.toDataURL("image/png");
			link.click();
		} catch (err) {
			console.error("Export failed:", err);
			alert('PNG export failed. Try the "Print / PDF" option instead!');
		}

		setIsExporting(false);
	};

	const printPDF = () => {
		if (!image) return;

		const printWindow = window.open("", "_blank");

		const usedPlantsHTML = usedPlants
			.map(
				(plant) => `
      <div style="display: flex; align-items: center; gap: 8px; margin-right: 16px;">
        <div style="width: 24px; height: 24px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 14px; background-color: ${plant.color};">
          ${plant.icon}
        </div>
        <span style="font-size: 14px; color: #374151;">${plant.name}</span>
        <span style="font-size: 14px; color: #9ca3af;">×${plantCounts[plant.id]}</span>
      </div>
    `,
			)
			.join("");

		const gridCellsHTML = Array.from({ length: gridConfig.rows }, (_, row) =>
			Array.from({ length: gridConfig.cols }, (_, col) => {
				const key = cellKey(row, col);
				const plant = garden[key];
				const cellSize = Math.min(
					gridConfig.width / gridConfig.cols,
					gridConfig.height / gridConfig.rows,
				);

				return `
          <div style="
            border: 1px solid rgba(22, 101, 52, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${cellSize * 0.6}px;
            ${plant ? `background-color: ${plant.color};` : "background-color: rgba(20, 83, 45, 0.2);"}
          ">
            ${plant ? plant.icon : ""}
          </div>
        `;
			}).join(""),
		).join("");

		printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Garden Plan</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; background: #fafaf9; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div style="margin-bottom: 16px;">
            <h1 style="font-size: 24px; font-weight: bold; color: #166534;">🌱 Garden Plan</h1>
            <p style="font-size: 14px; color: #6b7280;">Created ${new Date().toLocaleDateString()}</p>
          </div>

          <div style="position: relative; display: inline-block; border: 2px solid #d6d3d1; border-radius: 8px; overflow: hidden;">
            <img src="${image}" style="max-width: 700px; height: auto; display: block; opacity: ${gridConfig.imageOpacity};" />

            <div style="
              position: absolute;
              left: ${gridConfig.x}px;
              top: ${gridConfig.y}px;
              width: ${gridConfig.width}px;
              height: ${gridConfig.height}px;
              border: 2px solid #16a34a;
              border-radius: 4px;
              opacity: ${gridConfig.opacity};
              display: grid;
              grid-template-columns: repeat(${gridConfig.cols}, 1fr);
              grid-template-rows: repeat(${gridConfig.rows}, 1fr);
            ">
              ${gridCellsHTML}
            </div>
          </div>

          ${
						usedPlants.length > 0
							? `
            <div style="margin-top: 16px; padding: 16px; background: white; border-radius: 8px; border: 1px solid #e7e5e4;">
              <h2 style="font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 12px;">Legend</h2>
              <div style="display: flex; flex-wrap: wrap;">
                ${usedPlantsHTML}
              </div>
              <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e7e5e4; font-size: 14px; color: #4b5563;">
                Total: ${Object.values(plantCounts).reduce((a, b) => a + b, 0)} plants • Grid: ${gridConfig.rows} × ${gridConfig.cols}
              </div>
            </div>
          `
							: ""
					}

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 250);
            };
          </script>
        </body>
      </html>
    `);

		printWindow.document.close();
	};

	const cellWidth = gridConfig.width / gridConfig.cols;
	const cellHeight = gridConfig.height / gridConfig.rows;

	return (
		<div className="min-h-screen bg-stone-100 p-4">
			<div className="max-w-6xl mx-auto">
				<h1 className="text-3xl font-bold text-green-800 mb-1 text-center">
					🌱 Garden Planner
				</h1>
				<p className="text-gray-600 text-center mb-1 text-sm">
					Upload an aerial photo, position the grid over your garden bed, then
					plan your plants!
				</p>
				<p className="text-gray-400 text-center mb-4 text-xs">
					💾 Auto-saves to your browser
				</p>

				<div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
					{/* Left sidebar - Controls */}
					<div className="lg:col-span-1 space-y-4">
						{/* Image Upload */}
						<div className="bg-white rounded-lg shadow p-4">
							<h2 className="text-sm font-semibold text-gray-700 mb-2">
								📷 Reference Image
							</h2>
							<input
								ref={fileInputRef}
								type="file"
								accept="image/*"
								onChange={handleImageUpload}
								className="hidden"
							/>
							<button
								onClick={() => fileInputRef.current.click()}
								className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
							>
								Upload Image
							</button>
							{image && (
								<div className="mt-3">
									<label className="text-xs text-gray-600">
										Image Opacity: {Math.round(gridConfig.imageOpacity * 100)}%
									</label>
									<input
										type="range"
										min="0.1"
										max="1"
										step="0.05"
										value={gridConfig.imageOpacity}
										onChange={(e) =>
											setGridConfig({
												...gridConfig,
												imageOpacity: parseFloat(e.target.value),
											})
										}
										className="w-full"
									/>
								</div>
							)}
							<p className="text-xs text-gray-500 mt-2">
								Or drag & drop onto the canvas. Use drone photos, Google Maps
								satellite view, etc.
							</p>
						</div>

						{/* Grid Controls */}
						<div className="bg-white rounded-lg shadow p-4">
							<h2 className="text-sm font-semibold text-gray-700 mb-3">
								📐 Grid Settings
							</h2>
							<div className="space-y-3">
								<div>
									<label className="text-xs text-gray-600">
										Rows: {gridConfig.rows}
									</label>
									<input
										type="range"
										min="2"
										max="15"
										value={gridConfig.rows}
										onChange={(e) =>
											setGridConfig({
												...gridConfig,
												rows: parseInt(e.target.value),
											})
										}
										className="w-full"
									/>
								</div>
								<div>
									<label className="text-xs text-gray-600">
										Columns: {gridConfig.cols}
									</label>
									<input
										type="range"
										min="2"
										max="15"
										value={gridConfig.cols}
										onChange={(e) =>
											setGridConfig({
												...gridConfig,
												cols: parseInt(e.target.value),
											})
										}
										className="w-full"
									/>
								</div>
								<div>
									<label className="text-xs text-gray-600">
										Grid Opacity: {Math.round(gridConfig.opacity * 100)}%
									</label>
									<input
										type="range"
										min="0.1"
										max="1"
										step="0.05"
										value={gridConfig.opacity}
										onChange={(e) =>
											setGridConfig({
												...gridConfig,
												opacity: parseFloat(e.target.value),
											})
										}
										className="w-full"
									/>
								</div>
							</div>
							<p className="text-xs text-gray-500 mt-3">
								💡 Drag the grid header to move. Drag the corner to resize.
							</p>
						</div>

						{/* Plant Palette */}
						<div className="bg-white rounded-lg shadow p-4">
							<h2 className="text-sm font-semibold text-gray-700 mb-2">
								🌿 Plants
							</h2>
							<div className="flex flex-wrap gap-1.5">
								{PLANTS.map((plant) => (
									<button
										key={plant.id}
										onClick={() =>
											setSelectedPlant(
												selectedPlant?.id === plant.id ? null : plant,
											)
										}
										className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-all ${
											selectedPlant?.id === plant.id
												? "ring-2 ring-green-500 bg-green-100"
												: "bg-gray-100 hover:bg-gray-200"
										}`}
										title={plant.name}
									>
										<span>{plant.icon}</span>
										<span className="hidden sm:inline">{plant.name}</span>
									</button>
								))}
							</div>
							<p className="text-xs text-gray-500 mt-2">
								Select a plant, click cells to place. Click planted cells to
								remove.
							</p>
						</div>

						{/* Actions */}
						<div className="bg-white rounded-lg shadow p-4 space-y-2">
							<button
								onClick={downloadPNG}
								disabled={!image || Object.keys(garden).length === 0}
								className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
							>
								📥 Download PNG
							</button>
							<button
								onClick={printPDF}
								disabled={!image || Object.keys(garden).length === 0}
								className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
							>
								🖨️ Print / PDF
							</button>
							<button
								onClick={clearGarden}
								className="w-full px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm"
							>
								Clear All Plants
							</button>
							<button
								onClick={clearSavedData}
								className="w-full px-4 py-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors text-sm"
							>
								🗑️ Reset Everything
							</button>
							{saveStatus && (
								<div className="text-xs text-center text-gray-500 py-1">
									{saveStatus}
								</div>
							)}
						</div>

						{/* Plant Summary */}
						{Object.keys(plantCounts).length > 0 && (
							<div className="bg-white rounded-lg shadow p-4">
								<h2 className="text-sm font-semibold text-gray-700 mb-2">
									📋 Summary
								</h2>
								<div className="space-y-1">
									{Object.entries(plantCounts).map(([plantId, count]) => {
										const plant = PLANTS.find((p) => p.id === plantId);
										return (
											<div
												key={plantId}
												className="flex items-center justify-between text-sm"
											>
												<span>
													{plant.icon} {plant.name}
												</span>
												<span className="font-medium text-gray-700">
													{count}
												</span>
											</div>
										);
									})}
									<div className="border-t pt-1 mt-2 flex justify-between text-sm font-medium">
										<span>Total</span>
										<span>
											{Object.values(plantCounts).reduce((a, b) => a + b, 0)}
										</span>
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Main canvas area */}
					<div className="lg:col-span-3">
						<div
							ref={containerRef}
							onDrop={handleDrop}
							onDragOver={handleDragOver}
							className="relative bg-stone-300 rounded-lg shadow-lg overflow-hidden"
							style={{ minHeight: "500px", height: image ? "auto" : "500px" }}
						>
							{!image ? (
								<div className="absolute inset-0 flex flex-col items-center justify-center text-stone-500 border-2 border-dashed border-stone-400 rounded-lg m-4">
									<div className="text-6xl mb-4">🖼️</div>
									<p className="text-lg font-medium">Drop an image here</p>
									<p className="text-sm">or use the upload button</p>
									<p className="text-xs mt-4 text-stone-400">
										Aerial view of your garden works best!
									</p>
								</div>
							) : (
								<>
									{/* Reference Image */}
									<img
										src={image}
										alt="Garden reference"
										className="w-full h-auto block"
										style={{ opacity: gridConfig.imageOpacity }}
										draggable={false}
									/>

									{/* Grid Overlay */}
									<div
										className="absolute border-2 border-green-600 rounded"
										style={{
											left: gridConfig.x,
											top: gridConfig.y,
											width: gridConfig.width,
											height: gridConfig.height,
											opacity: gridConfig.opacity,
										}}
									>
										{/* Move handle */}
										<div
											onMouseDown={(e) => handleGridMouseDown(e, "move")}
											className="absolute -top-6 left-0 right-0 h-6 bg-green-600 rounded-t cursor-move flex items-center justify-center text-white text-xs font-medium"
											style={{ opacity: 1 }}
										>
											⋮⋮ Drag to move
										</div>

										{/* Grid cells */}
										<div
											className="w-full h-full grid"
											style={{
												gridTemplateColumns: `repeat(${gridConfig.cols}, 1fr)`,
												gridTemplateRows: `repeat(${gridConfig.rows}, 1fr)`,
											}}
										>
											{Array.from({ length: gridConfig.rows }, (_, row) =>
												Array.from({ length: gridConfig.cols }, (_, col) => {
													const key = cellKey(row, col);
													const plant = garden[key];
													const isDragSource = dragPlant?.fromKey === key;

													return (
														<div
															key={key}
															onClick={() => handleCellClick(row, col)}
															draggable={
																!!plant && !isRepositioning && !isResizing
															}
															onDragStart={(e) =>
																handlePlantDragStart(e, row, col)
															}
															onDragOver={(e) => {
																e.preventDefault();
																e.stopPropagation();
															}}
															onDrop={(e) => handlePlantDrop(e, row, col)}
															className={`
                                border border-green-600/50 flex items-center justify-center
                                transition-all cursor-pointer
                                ${plant ? "hover:brightness-110" : "bg-green-900/20 hover:bg-green-500/40"}
                                ${isDragSource ? "opacity-30" : ""}
                                ${!plant && selectedPlant ? "hover:ring-2 ring-inset ring-yellow-400" : ""}
                              `}
															style={
																plant
																	? {
																			backgroundColor: plant.color,
																			fontSize:
																				Math.min(cellWidth, cellHeight) * 0.6,
																		}
																	: {}
															}
															title={
																plant
																	? `${plant.name} (click to remove)`
																	: selectedPlant
																		? `Plant ${selectedPlant.name}`
																		: "Select a plant"
															}
														>
															{plant && (
																<span className="drop-shadow-md">
																	{plant.icon}
																</span>
															)}
														</div>
													);
												}),
											)}
										</div>

										{/* Resize handle */}
										<div
											onMouseDown={(e) => handleGridMouseDown(e, "resize")}
											className="absolute -bottom-3 -right-3 w-6 h-6 bg-green-600 rounded-full cursor-se-resize flex items-center justify-center text-white text-xs"
											style={{ opacity: 1 }}
										>
											⤡
										</div>
									</div>
								</>
							)}
						</div>
					</div>
				</div>

				{/* Export View - Hidden, used for PNG generation */}
				{isExporting && (
					<div
						ref={exportRef}
						className="fixed left-0 top-0 bg-stone-50 p-6"
						style={{ width: "1200px", zIndex: -1 }}
					>
						<div className="mb-4">
							<h1 className="text-2xl font-bold text-green-800">
								🌱 Garden Plan
							</h1>
							<p className="text-sm text-gray-500">
								Created {new Date().toLocaleDateString()}
							</p>
						</div>

						{/* Garden with grid */}
						<div className="relative inline-block border-2 border-stone-300 rounded-lg overflow-hidden">
							<img
								src={image}
								alt="Garden"
								style={{
									maxWidth: "900px",
									height: "auto",
									display: "block",
									opacity: gridConfig.imageOpacity,
								}}
							/>

							{/* Grid overlay for export */}
							<div
								className="absolute border-2 border-green-600 rounded"
								style={{
									left: gridConfig.x,
									top: gridConfig.y,
									width: gridConfig.width,
									height: gridConfig.height,
									opacity: gridConfig.opacity,
								}}
							>
								<div
									className="w-full h-full grid"
									style={{
										gridTemplateColumns: `repeat(${gridConfig.cols}, 1fr)`,
										gridTemplateRows: `repeat(${gridConfig.rows}, 1fr)`,
									}}
								>
									{Array.from({ length: gridConfig.rows }, (_, row) =>
										Array.from({ length: gridConfig.cols }, (_, col) => {
											const key = cellKey(row, col);
											const plant = garden[key];

											return (
												<div
													key={key}
													className="border border-green-600/50 flex items-center justify-center"
													style={
														plant
															? {
																	backgroundColor: plant.color,
																	fontSize:
																		Math.min(
																			gridConfig.width / gridConfig.cols,
																			gridConfig.height / gridConfig.rows,
																		) * 0.6,
																}
															: { backgroundColor: "rgba(20, 83, 45, 0.2)" }
													}
												>
													{plant && <span>{plant.icon}</span>}
												</div>
											);
										}),
									)}
								</div>
							</div>
						</div>

						{/* Legend */}
						{usedPlants.length > 0 && (
							<div className="mt-4 p-4 bg-white rounded-lg border border-stone-200">
								<h2 className="text-sm font-semibold text-gray-700 mb-3">
									Legend
								</h2>
								<div className="flex flex-wrap gap-4">
									{usedPlants.map((plant) => (
										<div key={plant.id} className="flex items-center gap-2">
											<div
												className="w-6 h-6 rounded flex items-center justify-center text-sm"
												style={{ backgroundColor: plant.color }}
											>
												{plant.icon}
											</div>
											<span className="text-sm text-gray-700">
												{plant.name}
											</span>
											<span className="text-sm text-gray-400">
												×{plantCounts[plant.id]}
											</span>
										</div>
									))}
								</div>
								<div className="mt-3 pt-3 border-t text-sm text-gray-600">
									Total: {Object.values(plantCounts).reduce((a, b) => a + b, 0)}{" "}
									plants • Grid: {gridConfig.rows} × {gridConfig.cols}
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
