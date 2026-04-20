from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import User, UserSettings


@receiver(post_save, sender=User)
def ensure_user_settings(sender, instance: User, created: bool, **kwargs) -> None:
    if created:
        UserSettings.objects.get_or_create(user=instance)
