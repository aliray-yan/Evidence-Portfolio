package com.safehaven.app.ui

import android.graphics.Color as AndroidColor
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.Polyline

/** OpenStreetMap view of the GPS track (no API key needed). Shows the last point with a marker. */
@Composable
fun TrackMap(points: List<Pair<Double, Double>>, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val mapView = remember {
        MapView(context).apply {
            setTileSource(TileSourceFactory.MAPNIK)
            setMultiTouchControls(true)
            controller.setZoom(16.0)
        }
    }
    DisposableEffect(mapView) {
        mapView.onResume()
        onDispose {
            mapView.onPause()
            mapView.onDetach()
        }
    }
    AndroidView(
        factory = { mapView },
        modifier = modifier,
        update = { map ->
            map.overlays.clear()
            val geoPoints = points.map { GeoPoint(it.first, it.second) }
            if (geoPoints.size > 1) {
                val line = Polyline(map)
                line.setPoints(geoPoints)
                line.outlinePaint.color = AndroidColor.parseColor("#2563EB")
                line.outlinePaint.strokeWidth = 8f
                map.overlays.add(line)
            }
            geoPoints.lastOrNull()?.let { last ->
                val marker = Marker(map)
                marker.position = last
                marker.setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                marker.title = "Last known position"
                map.overlays.add(marker)
                map.controller.setCenter(last)
            }
            map.invalidate()
        },
    )
}
