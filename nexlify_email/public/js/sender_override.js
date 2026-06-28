frappe.provide('nexlify_email');
$(document).on('app_ready', function() {
	if (nexlify_email._sender_patched) {
		return;
	}
	if (!frappe.views || !frappe.views.CommunicationComposer) {
		return;
	}
	nexlify_email._sender_patched = true;

	frappe.db.get_list('Email Account', {
		filters: { enable_outgoing: 1 },
		fields: ['email_id'],
		limit: 0
	}).then(function(accounts) {
		var all_emails = [];
		for (var i = 0; i < accounts.length; i++) {
			all_emails.push(accounts[i].email_id);
		}

		var original_make = frappe.views.CommunicationComposer.prototype.make;

		frappe.views.CommunicationComposer.prototype.make = function() {
			original_make.apply(this, arguments);
			if (this.dialog && this.dialog.$wrapper) {
				this.dialog.$wrapper.addClass('nexlify-email-composer');
			}
		};

		var original_get_fields = frappe.views.CommunicationComposer.prototype.get_fields;

		frappe.views.CommunicationComposer.prototype.get_fields = function() {
			var fields = original_get_fields.apply(this, arguments);
			var sender = null;
			for (var j = 0; j < fields.length; j++) {
				if (fields[j].fieldname === 'sender') {
					sender = fields[j];
					break;
				}
			}
			if (sender) {
				sender.options = all_emails;
			} else {
				this.user_email_accounts = all_emails;
				fields.unshift({
					label: __('From'),
					fieldtype: 'Select',
					reqd: 1,
					fieldname: 'sender',
					options: all_emails,
					default: all_emails[0]
				});
			}
			return fields;
		};
	});
});