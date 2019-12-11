"""lmao URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/2.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from django.conf.urls import url, include   
from django.views.generic.base import RedirectView
from lmao import settings
from rest_framework.authtoken import views as token_views
from rest_framework import routers

dev_urls = [
    path('admin/', admin.site.urls),
]

urlpatterns = [
    url(r'^', include('endpoints.urls')),
    # url(r'^', include(router.urls)),
    # url(r'^api-v1/api-auth/', include('rest_framework.urls', namespace='rest_framework')),
    # url(r'^api-v1/api-token-auth/', token_views.obtain_auth_token)
]

if settings.DEBUG:
    urlpatterns = dev_urls + urlpatterns

