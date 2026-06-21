# Capacitor
-keep class com.getcapacitor.** { *; }
-keep class com.sudhanshu.celebrationqr.** { *; }
-dontwarn com.getcapacitor.**

# Cordova (used by some Capacitor plugins)
-keep class org.apache.cordova.** { *; }
-dontwarn org.apache.cordova.**

# WebView JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Firebase
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Google Play Services
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# Keep generic type info for Gson / Retrofit if used
-keepattributes Signature
-keepattributes *Annotation*
