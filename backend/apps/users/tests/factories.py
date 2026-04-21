"""Factory Boy factories + constants for auth tests.

``TEST_EMAIL_SUFFIX`` marks every fixture-created account so sweeps are
surgical — a teardown helper deletes rows whose email ends with this
suffix without touching unrelated data.
"""

import factory
from allauth.account.models import EmailAddress

from apps.users.models import User

TEST_EMAIL_SUFFIX = "@test.sofi.local"
DEFAULT_TEST_PASSWORD = "Correct-Horse-Battery-9"  # noqa: S105 (test fixture)


class UserFactory(factory.django.DjangoModelFactory):
    """Creates a User row + an unverified primary EmailAddress.

    Use this when the test is about the unverified state. For tests that
    need a user who can sign in, use ``VerifiedUserFactory``.
    """

    class Meta:
        model = User
        django_get_or_create = ("email",)
        skip_postgeneration_save = True

    email = factory.Sequence(lambda n: f"user{n:04d}{TEST_EMAIL_SUFFIX}")
    display_name = factory.Faker("name")
    is_active = True

    @factory.post_generation
    def _email_address(obj, _create, _extracted, **_kwargs):
        EmailAddress.objects.update_or_create(
            user=obj,
            email=obj.email,
            defaults={"primary": True, "verified": False},
        )

    @factory.post_generation
    def password(obj, create, extracted, **_kwargs):
        obj.set_password(extracted or DEFAULT_TEST_PASSWORD)
        if create:
            obj.save(update_fields=["password"])


class VerifiedUserFactory(UserFactory):
    @factory.post_generation
    def _email_address(obj, _create, _extracted, **_kwargs):  # noqa: F811
        EmailAddress.objects.update_or_create(
            user=obj,
            email=obj.email,
            defaults={"primary": True, "verified": True},
        )
