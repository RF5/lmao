from . import views 
from django.urls import path
from django.conf.urls import url, include
from rest_framework.urlpatterns import format_suffix_patterns
# urlpatterns = []

urlpatterns = [
    # path('url_checker', views.check_url),
    *format_suffix_patterns([url(r'^infer$', views.Infer.as_view())], allowed=['json', 'html', 'api']),
]
