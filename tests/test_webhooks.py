from app import webhooks


def test_webhook_router():
    assert hasattr(webhooks, 'router')
