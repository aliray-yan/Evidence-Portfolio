# Keep annotation metadata used by Hilt, Room, Gson TypeToken, and Kotlin runtime.
-keepattributes Signature,*Annotation*,InnerClasses,EnclosingMethod

# Android entry points are referenced from the manifest and must keep stable names.
-keep class com.ihadrs.mobile.core.IHADRSApplication { *; }
-keep class com.ihadrs.mobile.ui.MainActivity { *; }
-keep class com.ihadrs.mobile.monitoring.service.MonitoringService { *; }
-keep class com.ihadrs.mobile.monitoring.receivers.* { *; }
-keep class com.ihadrs.mobile.monitoring.workers.* { *; }

# Gson parses these raw JSON DTOs by field name from bundled rule/intel catalogs.
-keep class com.ihadrs.mobile.detection.rules.RawDetectionRule { *; }
-keep class com.ihadrs.mobile.detection.intel.RawThreatIntelCatalog { *; }
-keep class com.ihadrs.mobile.data.models.Soc** { *; }
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# Hilt generated aggregations are loaded by generated code during app startup.
-keep class dagger.hilt.** { *; }
-keep class hilt_aggregated_deps.** { *; }
-keep class *_HiltModules_* { *; }
-keep class Hilt_* { *; }

# Room schemas/entities are generated at compile time, but keep model members stable for migrations/debugging.
-keep class com.ihadrs.mobile.data.local.entities.** { *; }
-keep class com.ihadrs.mobile.data.local.database.** { *; }

# TensorFlow Lite includes optional native/runtime classes that vary by ABI.
-dontwarn org.tensorflow.lite.**
