package com.ict_works

import android.os.Bundle;
import org.devio.rn.splashscreen.SplashScreen;
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
      SplashScreen.show(this) // Afficher l’écran de démarrage
      super.onCreate(savedInstanceState)
  }

  override fun getMainComponentName(): String = "ict_works"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
