# GitHub OAuth Environment Variables
# Copy this file to set-env.sh and replace the values with your actual GitHub OAuth app credentials

export GITHUB_CLIENT_ID="Ov23lipGNQsjO5oFhS91"
export GITHUB_CLIENT_SECRET="c46874c8882454f060b386957420b8ebf50476f5"
export GITHUB_SCOPE="user:email,repo"
export GITHUB_ORG_NAME="esprithub"

echo "GitHub OAuth environment variables set!"
echo "Client ID: $GITHUB_CLIENT_ID"
echo "Client Secret: [HIDDEN]"
echo "Scope: $GITHUB_SCOPE"
echo "Organization: $GITHUB_ORG_NAME"
