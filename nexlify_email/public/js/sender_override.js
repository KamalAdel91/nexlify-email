frappe.provide('nexlify_email');

function injectStyles() {
	if (document.getElementById('nexlify-email-styles')) return;
	var style = document.createElement('style');
	style.id = 'nexlify-email-styles';

	var css = '';

	// Force EVERY field in the composer to full width
	css += '.nexlify-email-composer .frappe-control { flex: 0 0 100% !important; max-width: 100% !important; width: 100% !important; }';
	css += '.nexlify-email-composer .form-section .section-body > .row { display: block !important; }';

	// Make recipients / cc / bcc grow with content instead of fixed height
	css += '.nexlify-email-composer .frappe-control[data-fieldname="recipients"] .form-control,';
	css += '.nexlify-email-composer .frappe-control[data-fieldname="cc"] .form-control,';
	css += '.nexlify-email-composer .frappe-control[data-fieldname="bcc"] .form-control {';
	css += 'height: auto !important; min-height: 38px !important; max-height: none !important; overflow: visible !important; }';

	// Let the chip container wrap and show all selected emails
	css += '.nexlify-email-composer .frappe-control[data-fieldname="recipients"] .tb-selected,';
	css += '.nexlify-email-composer .frappe-control[data-fieldname="cc"] .tb-selected,';
	css += '.nexlify-email-composer .frappe-control[data-fieldname="bcc"] .tb-selected {';
	css += 'display: flex !important; flex-wrap: wrap !important; white-space: normal !important; width: 100% !important; height: auto !important; overflow: visible !important; }';

	style.textContent = css;
	document.head.appendChild(style);
}

$(document).on('app_ready', function() {
	if (nexlify_email._sender_patched) return;
	if (!frappe.views || !frappe.views.CommunicationComposer) return;
	nexlify_email._sender_patched = true;

	injectStyles();

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

			// Filter out Column Break fields so every field stacks vertically
			var clean_fields = [];
			for (var k = 0; k < fields.length; k++) {
				if (fields[k].fieldtype !== 'Column Break') {
					clean_fields.push(fields[k]);
				}
			}
			fields = clean_fields;

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