frappe.provide('nexlify_email');
console.log('nexlify_email: script loaded');





function injectStyles() {
	if (document.getElementById('nexlify-email-styles')) return;
	var style = document.createElement('style');
	style.id = 'nexlify-email-styles';
	var css = '';
	css += '.nexlify-email-composer .section-body { display: block !important; }';
	css += '.nexlify-email-composer .form-column { flex: 0 0 100% !important; max-width: 100% !important; width: 100% !important; }';
	css += '.nexlify-email-composer .frappe-control.input-max-width { max-width: 100% !important; }';
	css += '.nexlify-email-composer .form-section form { display: block !important; }';
	css += '.nexlify-email-composer .frappe-control[data-fieldname="recipients"] { display: inline-block !important; width: calc(100% - 50px) !important; vertical-align: middle !important; }';
	css += '.nexlify-email-composer .frappe-control[data-fieldname="option_toggle_button"] { display: inline-block !important; vertical-align: middle !important; width: 40px !important; }';
	style.textContent = css;
	document.head.appendChild(style);
}






$(document).on('app_ready', function() {
	console.log('nexlify_email: app_ready fired');
	if (nexlify_email._sender_patched) return;
	if (!frappe.views || !frappe.views.CommunicationComposer) {
		console.log('nexlify_email: CommunicationComposer not available');
		return;
	}
	nexlify_email._sender_patched = true;
	console.log('nexlify_email: patching CommunicationComposer');

	injectStyles();

	var original_make = frappe.views.CommunicationComposer.prototype.make;
	console.log('nexlify_email: saved original_make', !!original_make);

	frappe.views.CommunicationComposer.prototype.make = function() {
		console.log('nexlify_email: custom make called');
		original_make.apply(this, arguments);
		if (this.dialog && this.dialog.$wrapper) {
			this.dialog.$wrapper.addClass('nexlify-email-composer');
			console.log('nexlify_email: added class to dialog');
		} else {
			console.log('nexlify_email: dialog or $wrapper missing after make');
		}
	};

	frappe.db.get_list('Email Account', {
		filters: { enable_outgoing: 1 },
		fields: ['email_id'],
		limit: 0
	}).then(function(accounts) {
		console.log('nexlify_email: got accounts', accounts.length);
		var all_emails = [];
		for (var i = 0; i < accounts.length; i++) {
			all_emails.push(accounts[i].email_id);
		}

		var original_get_fields = frappe.views.CommunicationComposer.prototype.get_fields;
		console.log('nexlify_email: saved original_get_fields', !!original_get_fields);

		frappe.views.CommunicationComposer.prototype.get_fields = function() {
			var fields = original_get_fields.apply(this, arguments);
			console.log('nexlify_email: get_fields called, fields count', fields.length);
			var sender = null;
			for (var j = 0; j < fields.length; j++) {
				if (fields[j].fieldname === 'sender') {
					sender = fields[j];
					break;
				}
			}
			if (sender) {
				sender.options = all_emails;
				console.log('nexlify_email: patched existing sender field');
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
				console.log('nexlify_email: added From field');
			}
			return fields;
		};
	});
});