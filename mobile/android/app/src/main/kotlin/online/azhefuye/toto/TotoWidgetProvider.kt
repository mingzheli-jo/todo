package online.azhefuye.toto

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.net.Uri
import android.widget.RemoteViews
import es.antonborri.home_widget.HomeWidgetLaunchIntent

class TotoWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        appWidgetIds.forEach { widgetId ->
            val views = RemoteViews(context.packageName, R.layout.toto_widget).apply {
                val memoIntent = HomeWidgetLaunchIntent.getActivity(
                    context, MainActivity::class.java, Uri.parse("totowidget://memo")
                )
                setOnClickPendingIntent(R.id.widget_memo_button, memoIntent)

                val taskIntent = HomeWidgetLaunchIntent.getActivity(
                    context, MainActivity::class.java, Uri.parse("totowidget://task")
                )
                setOnClickPendingIntent(R.id.widget_task_button, taskIntent)
            }
            appWidgetManager.updateAppWidget(widgetId, views)
        }
    }
}
