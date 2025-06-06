# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# Google Play Services
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# Firebase
-keep class com.google.firebase.** { *; }
-keepnames class com.google.firebase.** { *; }

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.swmansion.reanimated.** { *; }

# Keep your custom modules
-keep class com.ict_works.** { *; }

# React Native Reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Keep native methods
-keepclassmembers class * {
    @com.facebook.react.uimanager.annotations.ReactProp *;
}

# React Native Specific
-keep class com.facebook.react.devsupport.** { *; }
-dontwarn com.facebook.react.devsupport.**
-keep class com.facebook.jni.** { *; }

# Hermes Engine
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# Network Libraries
-keepclassmembers class * extends com.facebook.react.bridge.JavaScriptModule { 
    @com.facebook.react.bridge.ReactMethod *;
}

# Native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Exceptions and Serialization
-keepattributes Exceptions
-keepattributes Signature
-keepattributes SourceFile,LineNumberTable
-keepattributes *Annotation*
