# Registration Link WhatsApp Integration

This feature allows you to send registration links via WhatsApp directly from the admissions settings page.

## Features

- **Send Button**: Added to registration links in admissions settings
- **Phone & Name Input**: Modal dialog for entering parent details
- **URL Shortening**: Automatically shortens registration URLs
- **WhatsApp Template**: Uses approved Meta template `request_registration_link`
- **Message Preview**: Shows the message before sending

## Setup Requirements

### 1. WhatsApp Template Setup

The system requires a Meta WhatsApp template named `request_registration_link` with the following content:

```
Dear {{1}},

Here you go — as requested, please find the link to the Registration Form for admission at The Scholars' Home:

🔗 {{2}}
(If the link doesn't open, please copy and paste it into your browser.)

Once you submit the form, our Admissions Team will get in touch with you shortly.

If you need any help during the process, feel free to reach out.

📞 Admissions Helpdesk: +91-8628800056
📧 admissions@tsh.edu.in
🌐 www.tsh.edu.in

Warm regards
```

**Template Variables:**
- `{{1}}` - Parent Name
- `{{2}}` - Registration Form link (shortened)

**Important:** The template in Meta WhatsApp uses numbered placeholders (`{{1}}`, `{{2}}`), but the local database stores these as named variables (`variable_1`, `variable_2`). The system automatically handles this mapping.

### 2. Template Creation Steps

1. Go to [Meta Business Manager](https://business.facebook.com)
2. Navigate to WhatsApp Manager
3. Go to Account Tools > Message Templates
4. Click "Create Template"
5. Use these details:
   - **Template Name**: `request_registration_link`
   - **Language**: English
   - **Category**: Utility
   - **Template Content**: Use the content above

6. Submit for approval
7. Once approved, sync templates in the application

### 3. Sync Template to Database

Run the setup script to check and sync the template:

```bash
npm run setup-registration-template
```

Or manually sync all templates:

```bash
# Go to Communication > Templates in the admin panel
# Click "Sync Templates from WhatsApp"
```

## Usage

1. **Navigate to Admissions Settings**
   - Go to `/admissions/settings`
   - Find the registration links section

2. **Send Registration Link**
   - Click the "Send" button (green WhatsApp icon) next to any registration link
   - Enter parent name and phone number
   - Review the message preview
   - Click "Send via WhatsApp"

3. **Phone Number Format**
   - Accepts formats: `9876543210`, `+91 9876543210`, `+919876543210`
   - Automatically formats for WhatsApp API

## Technical Details

### Components Added

- `src/components/admissions/send-registration-link-modal.tsx` - Main modal component
- `src/utils/url-shortener.ts` - URL shortening utility
- `scripts/setup-registration-template.ts` - Template setup script

### Modified Files

- `src/app/admissions/settings/page.tsx` - Added send buttons and modal integration

### URL Shortening

The system automatically creates shortened URLs for registration links:
- Original: `https://app.tsh.edu.in/register/branch123/session456`
- Shortened: `https://app.tsh.edu.in/r/ABC12345`

### Error Handling

The system handles various error scenarios:
- Template not found or not approved
- Invalid phone numbers
- WhatsApp API failures
- Network connectivity issues

## Troubleshooting

### Template Not Found Error

If you see "Registration link template not found":

1. Ensure the template is created in Meta Business Manager
2. Verify the template name is exactly `request_registration_link`
3. Check the template is approved (not pending or rejected)
4. Sync templates in the communication module

### Template Parameter Validation Failed

If you see "Missing required parameter: variable_1, variable_2":

This means the template variables in the database don't match what's being sent. To fix:

1. **Check template variables in database:**
   - Go to Communication → Templates
   - Find the "request_registration_link" template
   - Check the `templateVariables` field

2. **Re-sync the template:**
   - Delete the existing template from Communication → Templates
   - Run the sync process again
   - Or run: `npm run setup-registration-template`

3. **Manual fix (if needed):**
   - The template should have `templateVariables: ['variable_1', 'variable_2']`
   - If it shows different variable names, the system will adapt automatically

4. **Verify in browser console:**
   - Open developer tools when sending
   - Check console logs for "🔍 Template variables:" and "🔍 Sending template parameters:"
   - This shows exactly what variables are expected vs. sent

### Phone Number Issues

- Use valid Indian mobile numbers (10 digits)
- Include country code for international numbers
- Remove special characters and spaces

### WhatsApp API Issues

1. Check WhatsApp configuration in Communication Settings
2. Verify Meta access tokens are valid
3. Ensure phone number ID is correct
4. Check Meta Business account status

## Security Notes

- Phone numbers are validated before sending
- Only approved WhatsApp templates are used
- URL shortening uses secure random IDs
- All communications are logged for audit

## Future Enhancements

- Database-based URL shortening with analytics
- Bulk sending to multiple parents
- Message scheduling
- Delivery status tracking
- Custom message templates