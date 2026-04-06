/**
 * Vienna OS Terraform Provider
 *
 * Manage Vienna OS governance resources via Terraform:
 * - vienna_policy: Governance policies
 * - vienna_agent: Agent registrations
 * - vienna_integration: External integrations (Slack, email, webhook)
 *
 * Usage:
 *   terraform {
 *     required_providers {
 *       vienna = {
 *         source  = "registry.terraform.io/vienna-os/vienna"
 *         version = "~> 1.0"
 *       }
 *     }
 *   }
 *
 *   provider "vienna" {
 *     url     = "https://console.regulator.ai"
 *     api_key = var.vienna_api_key
 *   }
 */

package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/hashicorp/terraform-plugin-sdk/v2/diag"
	"github.com/hashicorp/terraform-plugin-sdk/v2/helper/schema"
	"github.com/hashicorp/terraform-plugin-sdk/v2/plugin"
)

// ─── Provider ───

func Provider() *schema.Provider {
	return &schema.Provider{
		Schema: map[string]*schema.Schema{
			"url": {
				Type:        schema.TypeString,
				Required:    true,
				DefaultFunc: schema.EnvDefaultFunc("VIENNA_URL", "https://console.regulator.ai"),
				Description: "Vienna OS API URL",
			},
			"api_key": {
				Type:        schema.TypeString,
				Required:    true,
				Sensitive:   true,
				DefaultFunc: schema.EnvDefaultFunc("VIENNA_API_KEY", nil),
				Description: "Vienna OS API key (vos_xxx)",
			},
		},
		ResourcesMap: map[string]*schema.Resource{
			"vienna_policy":      resourcePolicy(),
			"vienna_agent":       resourceAgent(),
			"vienna_integration": resourceIntegration(),
		},
		DataSourcesMap: map[string]*schema.Resource{
			"vienna_policy":    dataSourcePolicy(),
			"vienna_agent":     dataSourceAgent(),
			"vienna_fleet":     dataSourceFleet(),
			"vienna_chain":     dataSourceChain(),
		},
		ConfigureContextFunc: providerConfigure,
	}
}

type viennaClient struct {
	URL    string
	APIKey string
	HTTP   *http.Client
}

func providerConfigure(ctx context.Context, d *schema.ResourceData) (interface{}, diag.Diagnostics) {
	url := d.Get("url").(string)
	apiKey := d.Get("api_key").(string)

	return &viennaClient{
		URL:    url,
		APIKey: apiKey,
		HTTP:   &http.Client{},
	}, nil
}

func (c *viennaClient) request(method, path string, body interface{}) (map[string]interface{}, error) {
	var bodyReader io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		bodyReader = bytes.NewReader(jsonBody)
	}

	req, err := http.NewRequest(method, fmt.Sprintf("%s/api/v1%s", c.URL, path), bodyReader)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.APIKey))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "terraform-provider-vienna/1.0")

	resp, err := c.HTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("API error %d: %s", resp.StatusCode, string(respBody))
	}

	var result map[string]interface{}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, err
	}

	return result, nil
}

// ─── Resources ───

func resourcePolicy() *schema.Resource {
	return &schema.Resource{
		CreateContext: resourcePolicyCreate,
		ReadContext:   resourcePolicyRead,
		UpdateContext: resourcePolicyUpdate,
		DeleteContext: resourcePolicyDelete,
		Schema: map[string]*schema.Schema{
			"name": {
				Type:        schema.TypeString,
				Required:    true,
				Description: "Policy name",
			},
			"description": {
				Type:        schema.TypeString,
				Optional:    true,
				Description: "Human-readable description",
			},
			"decision": {
				Type:        schema.TypeString,
				Required:    true,
				Description: "Decision: allow, deny, require_approval",
				ValidateFunc: func(val interface{}, key string) (warns []string, errs []error) {
					v := val.(string)
					valid := map[string]bool{"allow": true, "deny": true, "require_approval": true}
					if !valid[v] {
						errs = append(errs, fmt.Errorf("%q must be allow, deny, or require_approval, got: %s", key, v))
					}
					return
				},
			},
			"priority": {
				Type:        schema.TypeInt,
				Optional:    true,
				Default:     50,
				Description: "Policy priority (higher = higher priority)",
			},
			"enabled": {
				Type:        schema.TypeBool,
				Optional:    true,
				Default:     true,
				Description: "Whether the policy is active",
			},
			"scope_objectives": {
				Type:     schema.TypeList,
				Optional: true,
				Elem:     &schema.Schema{Type: schema.TypeString},
				Description: "Actions/objectives this policy applies to",
			},
			"scope_environments": {
				Type:     schema.TypeList,
				Optional: true,
				Elem:     &schema.Schema{Type: schema.TypeString},
				Description: "Environments this policy applies to",
			},
			"scope_risk_tiers": {
				Type:     schema.TypeList,
				Optional: true,
				Elem:     &schema.Schema{Type: schema.TypeString},
				Description: "Risk tiers this policy applies to (T0, T1, T2, T3)",
			},
			"approval_required": {
				Type:        schema.TypeBool,
				Optional:    true,
				Default:     false,
				Description: "Whether approval is required",
			},
		},
	}
}

func resourcePolicyCreate(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	client := m.(*viennaClient)

	body := map[string]interface{}{
		"name":        d.Get("name"),
		"description": d.Get("description"),
		"decision":    d.Get("decision"),
		"priority":    d.Get("priority"),
		"enabled":     d.Get("enabled"),
	}

	result, err := client.request("POST", "/policies", body)
	if err != nil {
		return diag.FromErr(err)
	}

	data, ok := result["data"].(map[string]interface{})
	if !ok {
		data = result
	}

	id, _ := data["id"].(string)
	if id == "" {
		id, _ = data["policy_id"].(string)
	}
	d.SetId(id)

	return resourcePolicyRead(ctx, d, m)
}

func resourcePolicyRead(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	client := m.(*viennaClient)

	result, err := client.request("GET", fmt.Sprintf("/policies/%s", d.Id()), nil)
	if err != nil {
		d.SetId("")
		return nil // Not found
	}

	data, ok := result["data"].(map[string]interface{})
	if !ok {
		data = result
	}

	d.Set("name", data["name"])
	d.Set("description", data["description"])
	d.Set("decision", data["decision"])
	d.Set("priority", data["priority"])
	d.Set("enabled", data["enabled"])

	return nil
}

func resourcePolicyUpdate(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	client := m.(*viennaClient)

	body := map[string]interface{}{
		"name":        d.Get("name"),
		"description": d.Get("description"),
		"decision":    d.Get("decision"),
		"priority":    d.Get("priority"),
		"enabled":     d.Get("enabled"),
	}

	_, err := client.request("PUT", fmt.Sprintf("/policies/%s", d.Id()), body)
	if err != nil {
		return diag.FromErr(err)
	}

	return resourcePolicyRead(ctx, d, m)
}

func resourcePolicyDelete(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	client := m.(*viennaClient)
	_, err := client.request("DELETE", fmt.Sprintf("/policies/%s", d.Id()), nil)
	if err != nil {
		return diag.FromErr(err)
	}
	d.SetId("")
	return nil
}

func resourceAgent() *schema.Resource {
	return &schema.Resource{
		CreateContext: resourceAgentCreate,
		ReadContext:   resourceAgentRead,
		DeleteContext: resourceAgentDelete,
		Schema: map[string]*schema.Schema{
			"name": {
				Type:     schema.TypeString,
				Required: true,
				ForceNew: true,
			},
			"description": {
				Type:     schema.TypeString,
				Optional: true,
				ForceNew: true,
			},
			"capabilities": {
				Type:     schema.TypeList,
				Optional: true,
				ForceNew: true,
				Elem:     &schema.Schema{Type: schema.TypeString},
			},
			"status": {
				Type:     schema.TypeString,
				Computed: true,
			},
		},
	}
}

func resourceAgentCreate(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	client := m.(*viennaClient)
	body := map[string]interface{}{
		"name":         d.Get("name"),
		"description":  d.Get("description"),
		"capabilities": d.Get("capabilities"),
	}
	result, err := client.request("POST", "/agents", body)
	if err != nil {
		return diag.FromErr(err)
	}
	data, ok := result["data"].(map[string]interface{})
	if !ok {
		data = result
	}
	id, _ := data["id"].(string)
	if id == "" {
		id, _ = data["agent_id"].(string)
	}
	d.SetId(id)
	return resourceAgentRead(ctx, d, m)
}

func resourceAgentRead(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	client := m.(*viennaClient)
	result, err := client.request("GET", fmt.Sprintf("/agents/%s", d.Id()), nil)
	if err != nil {
		d.SetId("")
		return nil
	}
	data, ok := result["data"].(map[string]interface{})
	if !ok {
		data = result
	}
	d.Set("name", data["name"])
	d.Set("status", data["status"])
	return nil
}

func resourceAgentDelete(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	client := m.(*viennaClient)
	_, err := client.request("DELETE", fmt.Sprintf("/agents/%s", d.Id()), nil)
	if err != nil {
		return diag.FromErr(err)
	}
	d.SetId("")
	return nil
}

func resourceIntegration() *schema.Resource {
	return &schema.Resource{
		CreateContext: resourceIntegrationCreate,
		ReadContext:   resourceIntegrationRead,
		UpdateContext: resourceIntegrationUpdate,
		DeleteContext: resourceIntegrationDelete,
		Schema: map[string]*schema.Schema{
			"name": {
				Type:     schema.TypeString,
				Required: true,
			},
			"type": {
				Type:     schema.TypeString,
				Required: true,
				ForceNew: true,
				Description: "Integration type: slack, email, webhook, github",
			},
			"config": {
				Type:      schema.TypeMap,
				Required:  true,
				Sensitive: true,
				Elem:      &schema.Schema{Type: schema.TypeString},
			},
			"enabled": {
				Type:     schema.TypeBool,
				Optional: true,
				Default:  true,
			},
			"events": {
				Type:     schema.TypeList,
				Optional: true,
				Elem:     &schema.Schema{Type: schema.TypeString},
				Description: "Events to subscribe to (e.g., approval_required, action_executed)",
			},
		},
	}
}

func resourceIntegrationCreate(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	client := m.(*viennaClient)
	body := map[string]interface{}{
		"name":    d.Get("name"),
		"type":    d.Get("type"),
		"config":  d.Get("config"),
		"enabled": d.Get("enabled"),
		"events":  d.Get("events"),
	}
	result, err := client.request("POST", "/integrations", body)
	if err != nil {
		return diag.FromErr(err)
	}
	data, ok := result["data"].(map[string]interface{})
	if !ok {
		data = result
	}
	id, _ := data["id"].(string)
	d.SetId(id)
	return resourceIntegrationRead(ctx, d, m)
}

func resourceIntegrationRead(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	client := m.(*viennaClient)
	result, err := client.request("GET", fmt.Sprintf("/integrations/%s", d.Id()), nil)
	if err != nil {
		d.SetId("")
		return nil
	}
	data, ok := result["data"].(map[string]interface{})
	if !ok {
		data = result
	}
	d.Set("name", data["name"])
	d.Set("type", data["type"])
	d.Set("enabled", data["enabled"])
	return nil
}

func resourceIntegrationUpdate(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	client := m.(*viennaClient)
	body := map[string]interface{}{
		"name":    d.Get("name"),
		"config":  d.Get("config"),
		"enabled": d.Get("enabled"),
		"events":  d.Get("events"),
	}
	_, err := client.request("PUT", fmt.Sprintf("/integrations/%s", d.Id()), body)
	if err != nil {
		return diag.FromErr(err)
	}
	return resourceIntegrationRead(ctx, d, m)
}

func resourceIntegrationDelete(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	client := m.(*viennaClient)
	_, err := client.request("DELETE", fmt.Sprintf("/integrations/%s", d.Id()), nil)
	if err != nil {
		return diag.FromErr(err)
	}
	d.SetId("")
	return nil
}

// ─── Data Sources ───

func dataSourcePolicy() *schema.Resource {
	return &schema.Resource{
		ReadContext: dataSourcePolicyRead,
		Schema: map[string]*schema.Schema{
			"policy_id": {Type: schema.TypeString, Required: true},
			"name":      {Type: schema.TypeString, Computed: true},
			"decision":  {Type: schema.TypeString, Computed: true},
			"priority":  {Type: schema.TypeInt, Computed: true},
			"enabled":   {Type: schema.TypeBool, Computed: true},
		},
	}
}

func dataSourcePolicyRead(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
	client := m.(*viennaClient)
	id := d.Get("policy_id").(string)
	result, err := client.request("GET", fmt.Sprintf("/policies/%s", id), nil)
	if err != nil {
		return diag.FromErr(err)
	}
	data, ok := result["data"].(map[string]interface{})
	if !ok {
		data = result
	}
	d.SetId(id)
	d.Set("name", data["name"])
	d.Set("decision", data["decision"])
	d.Set("priority", data["priority"])
	d.Set("enabled", data["enabled"])
	return nil
}

func dataSourceAgent() *schema.Resource {
	return &schema.Resource{
		ReadContext: func(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
			client := m.(*viennaClient)
			id := d.Get("agent_id").(string)
			result, err := client.request("GET", fmt.Sprintf("/agents/%s", id), nil)
			if err != nil {
				return diag.FromErr(err)
			}
			data, ok := result["data"].(map[string]interface{})
			if !ok {
				data = result
			}
			d.SetId(id)
			d.Set("name", data["name"])
			d.Set("status", data["status"])
			return nil
		},
		Schema: map[string]*schema.Schema{
			"agent_id": {Type: schema.TypeString, Required: true},
			"name":     {Type: schema.TypeString, Computed: true},
			"status":   {Type: schema.TypeString, Computed: true},
		},
	}
}

func dataSourceFleet() *schema.Resource {
	return &schema.Resource{
		ReadContext: func(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
			client := m.(*viennaClient)
			result, err := client.request("GET", "/fleet", nil)
			if err != nil {
				return diag.FromErr(err)
			}
			data, ok := result["data"].(map[string]interface{})
			if !ok {
				data = result
			}
			d.SetId("fleet")
			d.Set("agent_count", data["agent_count"])
			d.Set("active_count", data["active_count"])
			return nil
		},
		Schema: map[string]*schema.Schema{
			"agent_count":  {Type: schema.TypeInt, Computed: true},
			"active_count": {Type: schema.TypeInt, Computed: true},
		},
	}
}

func dataSourceChain() *schema.Resource {
	return &schema.Resource{
		ReadContext: func(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
			client := m.(*viennaClient)
			result, err := client.request("GET", "/warrant-chain/status", nil)
			if err != nil {
				return diag.FromErr(err)
			}
			data, ok := result["data"].(map[string]interface{})
			if !ok {
				data = result
			}
			d.SetId("chain")
			d.Set("chain_length", data["chain_length"])
			d.Set("chain_root", data["chain_root"])
			return nil
		},
		Schema: map[string]*schema.Schema{
			"chain_length": {Type: schema.TypeInt, Computed: true},
			"chain_root":   {Type: schema.TypeString, Computed: true},
		},
	}
}

// ─── Main ───

func main() {
	plugin.Serve(&plugin.ServeOpts{
		ProviderFunc: Provider,
	})
}
